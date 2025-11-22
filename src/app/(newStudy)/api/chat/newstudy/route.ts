import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { newStudySystem } from "@/app/(newStudy)/prompt";
import { newStudyTools } from "@/app/(newStudy)/tools";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
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
import { NextRequest, NextResponse } from "next/server";

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

  const shouldEndInterview = coreMessages.length > 24;

  const streamTextResult = streamText({
    // model: llm("claude-3-7-sonnet"),
    // model: llm(
    //   "gemini-2.5-flash",
    //   shouldEndInterview
    //     ? {} //必须去掉，否则 toolChoice: "required" 会调用 searchTool 最终还是没有调用 endInterview
    //     : { useSearchGrounding: true, dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" } },
    // ),
    model: llm("gpt-5-mini"),

    providerOptions: {
      openai: {
        // ...defaultProviderOptions.openai,
        reasoningSummary: "auto", // 'auto' | 'detailed'
        reasoningEffort: "minimal", // 'minimal' | 'low' | 'medium' | 'high'
      } satisfies OpenAIResponsesProviderOptions,
    },

    system: newStudySystem({ locale }),
    messages: coreMessages,
    tools,
    toolChoice: shouldEndInterview ? "required" : "auto",
    stopWhen: stepCountIs(2),
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
      chatLogger.error(`newstudy planning streamText onError: ${(error as Error).message}`);
    },

    abortSignal,
  });

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
