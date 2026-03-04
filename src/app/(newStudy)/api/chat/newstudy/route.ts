import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm, LLMModelName } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { newStudySystem } from "@/app/(newStudy)/prompt";
import { newStudyTools } from "@/app/(newStudy)/tools";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { correctUserInputMessage } from "@/lib/userChat/lib";
import { ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { after, NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken, attachments } = parseResult.data;

  // 动态检测用户输入的语言
  const locale = await detectInputLanguage({
    text: newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "",
    fallbackLocale: await getLocale(),
  });

  // Verify user has access to this chat
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      userId,
      kind: "misc",
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
  }

  const userChatId = userChat.id;

  // Handle attachments: assign IDs, prepend markers, store in context
  let messageLastPart = newMessage.lastPart;
  if (attachments && attachments.length > 0 && newMessage.role === "user") {
    const existingAttachments = userChat.context.attachments ?? [];
    const nextId = Math.max(0, ...existingAttachments.map((a) => a.id)) + 1;
    const attachmentsWithIds: (ChatMessageAttachment & { id: number })[] = attachments.map(
      (att, i) => ({ ...att, id: nextId + i }),
    );

    // Prepend [#N filename] markers to user text
    const markers = attachmentsWithIds.map((a) => `[#${a.id} ${a.name}]`).join("\n");
    if (messageLastPart.type === "text") {
      messageLastPart = { type: "text", text: `${markers}\n${messageLastPart.text}` };
    }

    // Store attachments in context
    await mergeUserChatContext({
      id: userChatId,
      context: { attachments: [...existingAttachments, ...attachmentsWithIds] },
    });
  }

  // Persist the new message
  await persistentAIMessageToDB({
    mode: "append",
    userChatId,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [messageLastPart],
      metadata: newMessage.metadata,
    },
  });

  {
    // checkUserTokenBalance
    const { balance } = await getUserTokens({ userId });
    if (balance != "Unlimited" && balance <= 0) {
      const message =
        locale === "zh-CN"
          ? "您的余额不足，请充值后再继续。"
          : "Your balance is insufficient, please recharge and try again.";
      const stream = createUIMessageStream({
        execute({ writer }) {
          // writer.write(formatDataStreamPart("start_step", { messageId: "insufficient_balance" }));
          // writer.write(formatDataStreamPart("text", message));
          // writer.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: "insufficient_balance" });
          writer.write({ type: "text-delta", id: "insufficient_balance", delta: message });
          writer.write({ type: "text-end", id: "insufficient_balance" });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }
  }

  const abortSignal = req.signal;
  const chatLogger = rootLogger.child({
    userChatId,
    userChatToken: userChat.token,
    kind: "misc",
  });

  const { statReport } = initGenericUserChatStatReporter({
    userId,
    userChatId,
    logger: chatLogger,
  });

  const tools = {
    ...newStudyTools({
      locale,
      userId,
      userChatId,
      abortSignal,
      statReport,
      logger: chatLogger,
    }),
  };
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId, {
    tools,
  });

  // 如果需要语音优化，立即启动（不等待）
  if (newMessage.metadata?.shouldCorrectUserMessage && newMessage.id) {
    // 不使用 await - 让优化与 streamText 并行执行
    after(
      correctUserInputMessage({
        userChatId,
        messageId: newMessage.id,
        contextMessages: coreMessages.slice(-3, -1), // 前面的 2 条消息作为上下文（排除最后一条，即当前消息）
        locale,
      }).catch((error) => {
        chatLogger.error({
          msg: "Voice message optimization failed",
          error: error.message,
        });
      }),
    );
  }

  const modelName = "claude-haiku-4-5" as LLMModelName; // gemini-2.5-flash, gpt-5-mini-responses, claude-haiku-4-5

  const streamTextResult = streamText({
    model: llm(modelName),
    providerOptions: {
      openai: {
        reasoningSummary: "auto", // 'auto' | 'detailed'
        reasoningEffort: "low", // 'minimal' | 'low' | 'medium' | 'high' 使用 web_search_preview 的时候, 不能为 minimal
      } satisfies OpenAIResponsesProviderOptions,
      anthropic: {
        thinking: {
          type: "disabled",
        },
      } satisfies AnthropicProviderOptions,
    },

    // 自定义的 tool 和模型内置的 tool 没法一起用，所以加了一个 webFetch 工具，在里面让 gemini 2.5 flash 去获取信息
    tools,

    prepareStep: async ({ messages }) => {
      if (messages.length > 24) {
        return {
          activeTools: ["endInterview"],
        };
      }
      return {};
    },

    // toolChoice: "auto",
    stopWhen: stepCountIs(3),

    system:
      newStudySystem({ locale }) +
      // 这个提示永远都可以加着，所以无需判断 shouldCorrectUserMessage 是否有设置，这样最大化 prompt cache 的利用
      (locale === "zh-CN"
        ? "\n\n用户通过语音输入，可能存在语音识别错误，请理解其真实意图。"
        : "\n\nUser input is from voice recognition and may contain transcription errors. Please understand the actual intent."),
    messages: coreMessages,

    // temperature: 0,  // gpt-5 不支持 temperature
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      // Persist the assistant's message parts as they are generated.
      if (
        streamingMessage.parts?.length
        // 🤔 这个判断不一定需要，只要 parts 长度不是 0 就可以保存
        // && streamingMessage.parts // 所有 text parts 的文本合在一起检测
        //   .map((part) => (part.type === "text" ? part.text : "")).join("").trim()
      ) {
        await persistentAIMessageToDB({
          mode: "override",
          userChatId,
          message: streamingMessage,
        });
      }
      const { tokens, extra } = calculateStepTokensUsage(step);
      chatLogger.info({
        msg: "newstudy planning streamText onStepFinish",
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: extra.usage,
        cache: extra.cache,
      });
      if (statReport) {
        const reportedBy = "newstudy planning chat";
        await statReport("tokens", tokens, { reportedBy, ...extra });
      }
    },

    onError: ({ error }) => {
      chatLogger.error(`newstudy planning streamText onError: ${error}`);
    },

    abortSignal,
  });

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
