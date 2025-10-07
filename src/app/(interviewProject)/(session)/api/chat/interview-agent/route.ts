import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { interviewAgentSystemPrompt } from "@/app/(interviewProject)/prompt";
import { interviewSessionTools } from "@/app/(interviewProject)/tools";
import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId, ModelMessage, smoothStream, stepCountIs, streamText } from "ai";
import { Locale } from "next-intl";
import { after, NextResponse } from "next/server";

function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    ">=1": false,
    ">=8": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = { bedrock: { cachePoint: { type: "default" } } };
    if (message.role === "assistant" && index >= 1 && !checkpoints[">=1"]) {
      checkpoints[">=1"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=8"]) {
      checkpoints[">=8"] = true;
      return { ...message, providerOptions };
    }
    return { ...message };
  });
  return cachedCoreMessages;
}

/**
 * ⚠️ fetchInterviewSessionChat 会检查权限，所以这里无需另外检查权限
 */
export async function POST(req: Request) {
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken } = parseResult.data;

  const sessionResult = await fetchInterviewSessionChat({ userChatToken });
  if (!sessionResult.success) {
    throwServerActionError(sessionResult);
  }

  const interviewSession = sessionResult.data;
  const { interviewSessionId, project, userChatId, extra: sessionExtra } = interviewSession;

  // Check and set interview session status if needed
  if (!sessionExtra.ongoing || !sessionExtra.startsAt) {
    await prisma.interviewSession.update({
      where: { id: interviewSessionId },
      data: {
        extra: {
          ...sessionExtra,
          ongoing: true,
          startsAt: Date.now(),
        } as InputJsonValue,
      },
    });
  }

  const chatLogger = rootLogger.child({
    userChatId,
    userChatToken,
    interviewSessionId,
  });

  const { statReport } = initInterviewProjectStatReporter({
    userId: project.user.id, // ⚠️ 这里是 project owner 的 userId，不是正在被访谈的 userId
    interviewProjectId: project.id,
    sessionUserChatId: userChatId,
    logger: chatLogger,
  });

  // Save the latest user message to database
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  // 动态检测用户输入的语言
  const locale = await detectInputLanguage({
    text: newMessage.parts // 所有 text parts 的文本合在一起检测
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
    fallbackLocale:
      sessionExtra.preferredLanguage &&
      VALID_LOCALES.includes(sessionExtra.preferredLanguage as Locale)
        ? (sessionExtra.preferredLanguage as Locale)
        : undefined,
  });

  // Generate system prompt based on interview context
  const systemPrompt = interviewAgentSystemPrompt({
    brief: project.brief,
    optimizedQuestions: project.extra?.optimizedQuestions,
    isPersonaInterview: false,
    locale,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);
  const { endInterview, requestInteractionForm } = interviewSessionTools({
    interviewSessionId,
  });

  const tools = {
    endInterview,
    requestInteractionForm,
  };
  const { coreMessages: _coreMessages, streamingMessage } = await prepareMessagesForStreaming(
    userChatId,
    { tools },
  );
  const coreMessages = setBedrockCache("claude-3-7-sonnet", _coreMessages);

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),

    providerOptions: defaultProviderOptions,

    system: systemPrompt,
    messages: coreMessages,

    toolChoice:
      coreMessages.length < 19
        ? "auto"
        : { type: "tool", toolName: InterviewToolName.endInterview },

    tools,

    stopWhen: stepCountIs(1),

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    abortSignal: mergedAbortSignal,

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
      // 👆 persist message to db
      const { usage, toolCalls } = step;
      const cache = step.providerMetadata?.bedrock?.usage as
        | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
        | undefined;
      chatLogger.info({
        msg: "human interview session streamText onStepFinish",
        usage,
        cache,
        toolCalls: toolCalls.map((call) => call.toolName),
      });
      if (usage.totalTokens && usage.totalTokens > 0) {
        const tokens =
          usage.totalTokens +
          Math.floor((cache?.cacheReadInputTokens || 0) / 10) +
          Math.floor((cache?.cacheWriteInputTokens || 0) * 1.25);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extra: any = {
          reportedBy: "human interview session",
          interviewSessionId,
          usage,
          cache,
        };
        await statReport("tokens", tokens, extra);
      }
    },

    onFinish: async () => {
      chatLogger.info("human interview session streamText onFinish");
    },

    onError: ({ error }) => {
      chatLogger.error(`human interview session streamText onError: ${(error as Error).message}`);
    },
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => {
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }),
  );

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
