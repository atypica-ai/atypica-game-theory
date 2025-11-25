import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { ClientMessagePayload } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { interviewAgentSystemPrompt } from "@/app/(interviewProject)/prompt";
import { interviewSessionTools } from "@/app/(interviewProject)/tools";
import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { ExtractServerActionData } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import {
  ModelMessage,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessageStreamWriter,
  UserModelMessage,
} from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

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

function calculateQuestionProgress(messages: ModelMessage[], totalQuestions: number) {
  const completed = new Set<number>();

  for (const message of messages) {
    if (message.role !== "assistant" || !message.content) continue;

    const parts = Array.isArray(message.content) ? message.content : [message.content];
    for (const part of parts) {
      if (
        typeof part === "object" &&
        part.type === "tool-call" &&
        part.toolName === InterviewToolName.selectQuestion &&
        typeof part.input === "object" &&
        part.input &&
        "questionIndex" in part.input
      ) {
        completed.add(part.input.questionIndex as number);
      }
    }
  }

  const completedIndices = Array.from(completed).sort((a, b) => a - b);
  const remainingIndices = Array.from({ length: totalQuestions }, (_, i) => i + 1).filter(
    (i) => !completed.has(i),
  );

  return { completedIndices, remainingIndices };
}

export async function runHumanInterview({
  statReport,
  logger,
  abortSignal,
  newMessage,
  interviewSession,
  streamWriter,
}: {
  statReport: StatReporter;
  logger: Logger;
  abortSignal: AbortSignal;
  newMessage: ClientMessagePayload["message"];
  interviewSession: ExtractServerActionData<typeof fetchInterviewSessionChat>;
  streamWriter: UIMessageStreamWriter;
}) {
  const { interviewSessionId, project, userChatId, extra: sessionExtra } = interviewSession;

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
  logger.debug({
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

  const streamTextPromise = new Promise<void>((resolve, reject) => {
    const streamTextResponse = streamText({
      model: llm("claude-sonnet-4-5"),

      providerOptions: defaultProviderOptions,

      system: systemPrompt,
      messages: modelMessages,

      prepareStep: async ({ messages }) => {
        const totalQuestions = questions?.length || 0;
        const { completedIndices, remainingIndices } = calculateQuestionProgress(
          messages,
          totalQuestions,
        );

        logger.info({
          msg: "Question progress",
          completedQuestionIndices: completedIndices,
          remainingQuestionIndices: remainingIndices,
          totalQuestions,
        });

        const progressInfo =
          totalQuestions > 0 && completedIndices.length > 0
            ? locale === "zh-CN"
              ? `\n已完成问题: ${completedIndices.join(", ")}`
              : `\nCompleted questions: ${completedIndices.join(", ")}`
            : "";

        const hintText =
          locale === "zh-CN"
            ? `[HINT] ${hint ? `${hint}\n` : ""}按顺序继续访谈，逐步深入，直到完成最后一个问题。${progressInfo}`
            : `[HINT] ${hint ? `${hint}\n` : ""}Continue the interview in sequential order, explore deeply, until completing the last question.${progressInfo}`;

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
        logger.info({
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

      onFinish: async ({ usage }) => {
        logger.info({ msg: "runHumanInterview streamText onFinish", usage });
        resolve();
      },

      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`runHumanInterview streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`runHumanInterview streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },

      abortSignal: abortSignal,
    });

    streamWriter.merge(
      streamTextResponse.toUIMessageStream({
        generateMessageId: () => streamingMessage.id,
      }),
    );

    abortSignal.addEventListener("abort", () => {
      reject(new Error("runHumanInterview abortSignal received"));
    }); // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消

    streamTextResponse
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  await streamTextPromise;
}
