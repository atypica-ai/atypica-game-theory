import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm, providerOptions } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import authOptions from "@/app/(auth)/authOptions";
import { newStudySystem } from "@/app/(newStudy)/prompt";
import { newStudyTools } from "@/app/(newStudy)/tools";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import {
  createDataStreamResponse,
  formatDataStreamPart,
  generateId,
  smoothStream,
  streamText,
} from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const locale = await getLocale();

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
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

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

  const shouldEndInterview = coreMessages.length > 24;

  {
    // checkUserTokenBalance
    const { permanentBalance, monthlyBalance } = await prisma.userTokens.findUniqueOrThrow({
      where: { userId },
    });
    const balance = permanentBalance + monthlyBalance;
    if (balance <= 0) {
      const message =
        locale === "zh-CN"
          ? "您的余额不足，请充值后再继续。"
          : "Your balance is insufficient, please recharge and try again.";
      return createDataStreamResponse({
        execute: async (dataStream) => {
          dataStream.write(
            formatDataStreamPart("start_step", { messageId: "insufficient_balance" }),
          );
          dataStream.write(formatDataStreamPart("text", message));
          dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
        },
      });
    }
  }

  const streamTextResult = streamText({
    // model: llm("claude-3-7-sonnet"),
    // model: llm(
    //   "gemini-2.5-flash",
    //   shouldEndInterview
    //     ? {} //必须去掉，否则 toolChoice: "required" 会调用 searchTool 最终还是没有调用 endInterview
    //     : { useSearchGrounding: true, dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" } },
    // ),
    model: llm("gpt-4.1-mini"),
    providerOptions,
    system: newStudySystem({ locale }),
    messages: coreMessages,
    tools: newStudyTools,
    toolChoice: shouldEndInterview ? "required" : "auto",
    maxSteps: 2,
    temperature: 0,
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      // Persist the assistant's message parts as they are generated.
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
      chatLogger.info({
        msg: "newstudy planning streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
      if (statReport) {
        const { usage } = step;
        const reportedBy = "newstudy planning chat";
        if (usage.totalTokens > 0) {
          const tokens = usage.totalTokens;
          await statReport("tokens", tokens, { reportedBy, usage });
        }
      }
    },
    onError: ({ error }) => {
      chatLogger.error(`newstudy planning streamText onError: ${(error as Error).message}`);
    },
    abortSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
