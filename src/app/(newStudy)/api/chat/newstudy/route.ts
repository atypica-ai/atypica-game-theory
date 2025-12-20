import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { newStudySystem } from "@/app/(newStudy)/prompt";
import { newStudyTools } from "@/app/(newStudy)/tools";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { correctUserInputMessage } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { azure } from "@ai-sdk/azure";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { vertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
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

  const { message: newMessage, userChatToken } = parseResult.data;

  // 动态检测用户输入的语言
  const locale = await detectInputLanguage({
    text: newMessage.parts // 所有 text parts 的文本合在一起检测
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
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

  // Persist the new message
  await persistentAIMessageToDB({
    userChatId,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
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

  const tools = { ...newStudyTools };
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

  const modelName = "gemini-2.5-flash" as LLMModelName; // gemini-2.5-flash, gpt-5-mini-responses, claude-haiku-4-5

  const streamTextResult = streamText({
    model: llm(modelName),
    providerOptions: {
      ...defaultProviderOptions,
      openai: {
        reasoningSummary: "auto", // 'auto' | 'detailed'
        reasoningEffort: "low", // 'minimal' | 'low' | 'medium' | 'high' 使用 web_search_preview 的时候, 不能为 minimal
      } satisfies OpenAIResponsesProviderOptions,
      google: {
        // thinkingConfig: { includeThoughts: true, thinkingLevel: "low" },  // 2.5 flash 不支持
      } satisfies GoogleGenerativeAIProviderOptions,
      anthropic: {
        thinking: {
          type: "disabled",
        },
      } satisfies AnthropicProviderOptions,
    },
    tools:
      modelName === "gemini-2.5-flash"
        ? ({
            ...tools, // 这样好像不行，Google 内置的工具没法和定义的工具一起用
            google_search: google.tools.googleSearch({ mode: "MODE_DYNAMIC" }), // tool 名字 google_search 是指定的，不能随便写
            url_context: google.tools.urlContext({}), // tool 名字 url_context 是指定的，不能随便写
          } as typeof tools)
        : modelName === "gpt-5-mini"
          ? ({
              ...tools,
              web_search_preview: azure.tools.webSearchPreview({
                searchContextSize: "low",
              }), // tool 名字 web_search_preview 是指定的，不能随便写，只支持 responses api
            } as typeof tools)
          : modelName === "claude-haiku-4-5"
            ? ({
                ...tools,
                web_search: vertexAnthropic.tools.webSearch_20250305({}), // 会报错，暂时不用了
                web_fetch: vertexAnthropic.tools.webFetch_20250910({}), // 会报错，暂时不用了
              } as typeof tools)
            : tools,

    prepareStep: async ({ messages }) => {
      if (messages.length > 24) {
        return {
          activeTools: ["endInterview"],
        };
      }
      return {};
    },

    // toolChoice: "auto",
    stopWhen: stepCountIs(2),

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
