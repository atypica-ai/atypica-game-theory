import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { interviewAgentSystemPrompt } from "@/app/(interviewProject)/prompt";
import { interviewSessionTools } from "@/app/(interviewProject)/tools";
import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { InterviewSessionExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import {
  generateId,
  ModelMessage,
  smoothStream,
  stepCountIs,
  streamText,
  UserModelMessage,
} from "ai";
import { Locale } from "next-intl";
import { after, NextResponse } from "next/server";

function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    ">=1": false,
    ">=8": false,
    ">=16": false,
    ">=32": false,
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
    if (message.role === "assistant" && index >= 16 && !checkpoints[">=16"]) {
      checkpoints[">=16"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 32 && !checkpoints[">=32"]) {
      checkpoints[">=32"] = true;
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
    await mergeExtra({
      tableName: "InterviewSession",
      id: interviewSessionId,
      extra: {
        ongoing: true,
        startsAt: Date.now(),
      } satisfies InterviewSessionExtra,
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
  await persistentAIMessageToDB({
    userChatId,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
    },
  });

  // 动态检测用户输入的语言
  // Special handling for [READY] message: use preferredLanguage directly
  const userMessageText = newMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  const locale =
    userMessageText === "[READY]"
      ? // For [READY], always use preferredLanguage (don't detect from the text)
        sessionExtra.preferredLanguage &&
        VALID_LOCALES.includes(sessionExtra.preferredLanguage as Locale)
        ? (sessionExtra.preferredLanguage as Locale)
        : "en-US"
      : // For normal messages, detect language
        await detectInputLanguage({
          text: newMessage.parts.map((part) => (part.type === "text" ? part.text : "")).join(""),
          fallbackLocale:
            sessionExtra.preferredLanguage &&
            VALID_LOCALES.includes(sessionExtra.preferredLanguage as Locale)
              ? (sessionExtra.preferredLanguage as Locale)
              : undefined,
        });

  // Generate system prompt based on interview context
  // Use questions from session snapshot (with fallback to project for backward compatibility)
  const questions = sessionExtra.questions || project.extra?.questions;

  let hint = "";
  if (newMessage.role === "assistant") {
    const lastPart = (newMessage as TInterviewMessageWithTool).parts.at(-1);
    if (
      lastPart?.type === `tool-${InterviewToolName.selectQuestion}` &&
      lastPart.state === "output-available"
    ) {
      hint = lastPart.output.question.hint ?? "";
    }
  }

  // Debug: Log questions to verify data
  chatLogger.debug({
    msg: "Interview questions data",
    hasSessionQuestions: !!sessionExtra.questions,
    hasProjectQuestions: !!project.extra?.questions,
    questionsCount: questions?.length || 0,
    firstQuestion: questions?.[0],
  });

  const systemPrompt = interviewAgentSystemPrompt({
    brief: project.brief,
    questions,
    isPersonaInterview: false,
    locale,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);
  const { endInterview, requestInteractionForm, selectQuestion } = interviewSessionTools({
    interviewSessionId,
  });

  const tools = {
    endInterview,
    requestInteractionForm,
    selectQuestion,
  };
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId, {
    tools,
  });
  const modelMessages = setBedrockCache("claude-sonnet-4", coreMessages);

  const streamTextResult = streamText({
    model: llm("claude-sonnet-4-5"),

    providerOptions: defaultProviderOptions,

    system: systemPrompt,
    messages: modelMessages,

    prepareStep: async ({ messages }) => {
      const hintText = hint
        ? `[HINT] ${hint}`
        : locale === "zh-CN"
          ? "[HINT] 继续访谈，逐步深入，确保覆盖所有预设问题"
          : "[HINT] Continue the interview, explore deeply, ensure all questions are covered";
      const modelMessages = [
        ...messages,
        { role: "user", content: hintText } satisfies UserModelMessage,
      ];
      const assistantCount = messages.filter(({ role }) => role === "assistant").length;
      if (assistantCount < 1) {
        return {
          toolChoice: "auto",
          activeTools: [InterviewToolName.requestInteractionForm],
          messages: modelMessages,
        };
      } else if (assistantCount < 100) {
        return {
          toolChoice: "auto",
          activeTools: [InterviewToolName.selectQuestion, InterviewToolName.endInterview],
          messages: modelMessages,
        };
      } else {
        return {
          toolChoice: "required",
          activeTools: [InterviewToolName.endInterview],
          messages: modelMessages,
        };
      }
    },

    tools: tools,

    stopWhen: stepCountIs(1),

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    abortSignal: mergedAbortSignal,

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          userChatId,
          message: streamingMessage,
        });
      }
      // 👆 persist message to db
      const { toolCalls } = step;
      const { tokens, extra } = calculateStepTokensUsage(step);
      chatLogger.info({
        msg: "human interview session streamText onStepFinish",
        usage: extra.usage,
        cache: extra.cache,
        toolCalls: toolCalls.map((call) => call.toolName),
      });
      if (statReport) {
        await statReport("tokens", tokens, {
          reportedBy: "human interview session",
          interviewSessionId,
          ...extra,
        });
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
