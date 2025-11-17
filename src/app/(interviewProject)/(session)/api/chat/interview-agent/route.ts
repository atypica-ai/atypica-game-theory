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
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { InterviewSessionExtra } from "@/prisma/client";
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
    ">=16": false,
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
    return { ...message };
  });
  return cachedCoreMessages;
}

/**
 * Check if the last user message contains an answer that triggers endInterview
 */
function shouldTriggerEndInterview(
  messages: ModelMessage[],
  sessionExtra: InterviewSessionExtra,
): boolean {
  // Get the last user message
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  if (!lastUserMessage) return false;

  // Extract text content from the message
  const messageText = typeof lastUserMessage.content === "string"
    ? lastUserMessage.content
    : lastUserMessage.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join(" ");

  if (!messageText) return false;

  // Get questions from session
  const questions = sessionExtra.questions || [];
  if (questions.length === 0) return false;

  // Check if any question's options with endInterview flag match the user's answer
  for (const question of questions) {
    if (!question.options) continue;

    // Check if any option with endInterview flag is mentioned in the message
    for (const option of question.options) {
      // Skip string options
      if (typeof option === "string") continue;

      // Type assertion for object options
      const optionObj = option as { text: string; endInterview?: boolean };

      // Check if this option should end the interview
      if (optionObj.endInterview === true) {
        const optionText = optionObj.text;
        if (messageText.includes(optionText)) {
          rootLogger.info({
            msg: "endInterview triggered by user answer",
            optionText,
            messageText,
          });
          return true;
        }
      }
    }
  }

  return false;
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

  // Debug: Log questions to verify data
  chatLogger.info({
    msg: "Interview questions data",
    hasSessionQuestions: !!sessionExtra.questions,
    hasProjectQuestions: !!project.extra?.questions,
    questionsCount: questions?.length || 0,
    firstQuestion: questions?.[0],
  });

  const systemPrompt = interviewAgentSystemPrompt({
    brief: project.brief,
    questions,
    questionTypePreference: project.extra?.questionTypePreference,
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
  const { coreMessages: _coreMessages, streamingMessage } = await prepareMessagesForStreaming(
    userChatId,
    { tools },
  );
  const coreMessages = setBedrockCache("claude-4-sonnet", _coreMessages);

  const streamTextResult = streamText({
    model: llm("claude-sonnet-4"),

    providerOptions: defaultProviderOptions,

    system: systemPrompt,
    messages: coreMessages,

    prepareStep: async ({ messages }) => {
      // Check if answer triggers endInterview
      if (shouldTriggerEndInterview(messages, sessionExtra)) {
        chatLogger.info("Forcing endInterview due to trigger option selected");
        return {
          toolChoice: { type: "tool", toolName: InterviewToolName.endInterview },
          activeTools: [InterviewToolName.endInterview],
        };
      }

      // TODO
      const assistantCount = messages.filter(({ role }) => role === "assistant").length;
      if (assistantCount < 80) {
        return {
          toolChoice: "auto",
          activeTools: [InterviewToolName.requestInteractionForm],
        };
      } else if (assistantCount < 150) {
        return {
          toolChoice: "auto",
        };
      } else {
        return {
          toolChoice: { type: "tool", toolName: InterviewToolName.endInterview },
          activeTools: [InterviewToolName.endInterview],
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
