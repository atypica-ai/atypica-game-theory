import "server-only";

import {
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  persistentAIMessageToDB,
} from "@/ai/messageUtils";
import { personaAgentSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { StatReporter } from "@/ai/tools/types";
import { interviewAgentSystemPrompt } from "@/app/(interviewProject)/prompt";
import { interviewSessionTools } from "@/app/(interviewProject)/tools";
import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { InterviewProjectExtra, InterviewSessionExtra } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, generateId, stepCountIs, streamText, UIMessage } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

const MAX_CONVERSATION_TURNS = 20;

function fixEmptyTextIssue(message: Omit<UIMessage, "role">) {
  // 有时候 personaReply 或 interviewerReply 的 content 是空的，这时候一般是调用了一次工具但还没有文本回复
  // 由于 interviewer 的 assistant 消息会转换成 user 消息给 persona，反过来也是一样，user role message 转换成 coreMessage 的时候，tool 的内容会被忽略，这样就产生了一条空消息，没意义
  // 还没太好的解决方案，有一种方案就是让 interviewer 或者 persona 继续生成，直到输出文本，然后再让另一方继续
  for (const part of message.parts ?? []) {
    if (part.type === "text" && !part.text.trim()) {
      part.text = "[CONTINUE]";
    }
  }
  // if (!message.content) {
  //   message.content = "[CONTINUE]";
  // }
}

async function saveMessage({
  message,
  userChatId,
  backgroundToken,
  logger,
}: {
  message: UIMessage;
  userChatId: number;
  backgroundToken: string;
  logger: Logger;
}) {
  try {
    // const { id: messageId, role, content, parts: _parts } = message;
    // const parts = _parts?.length ? _parts : [{ type: "text", text: content }];
    await prisma.$transaction(async (tx) => {
      // 先确保 backgroundToken 是当前的
      await tx.userChat.findUniqueOrThrow({
        where: { id: userChatId, kind: "interviewSession", backgroundToken },
      });
      await persistentAIMessageToDB(userChatId, message);
    });
  } catch (error) {
    logger.error(
      `Error saving interview messages with token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

export interface AutoPersonaInterviewParams {
  project: {
    id: number;
    brief: string;
    userId: number;
    extra?: InterviewProjectExtra;
  };
  sessionId: number;
  userChatId: number;
  personaId: number;
}

export async function runAutoPersonaInterview({
  sessionId,
  userChatId,
  project,
  personaId,
}: AutoPersonaInterviewParams): Promise<void> {
  const persona = await prisma.persona.findUniqueOrThrow({
    where: { id: personaId },
  });

  // 优先使用 persona 的语言，然后通过 project brief 猜测语言
  const locale: Locale =
    persona.locale && VALID_LOCALES.includes(persona.locale as Locale)
      ? (persona.locale as Locale)
      : await detectInputLanguage({ text: project.brief });

  // Set background token to prevent concurrent executions
  const backgroundToken = new Date().valueOf().toString();
  const userChat = await prisma.userChat.update({
    where: { id: userChatId, kind: "interviewSession" },
    data: { backgroundToken },
  });

  // Check and set interview session status if needed
  const currentSession = await prisma.interviewSession
    .findUniqueOrThrow({ where: { id: sessionId } })
    .then(({ extra, ...session }) => ({ extra: extra as InterviewSessionExtra, ...session }));
  if (!currentSession.extra.ongoing || !currentSession.extra.startsAt) {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        extra: {
          ...currentSession.extra,
          ongoing: true,
          startsAt: Date.now(),
        } as InputJsonValue,
      },
    });
  }

  const logger = rootLogger.child({
    userChatId,
    userChatToken: userChat.token,
    interviewSessionId: sessionId,
  });

  const { statReport } = initInterviewProjectStatReporter({
    userId: project.userId, // ⚠️ 这里是 project owner 的 userId，不是正在被访谈的 userId
    interviewProjectId: project.id,
    sessionUserChatId: userChatId,
    logger,
  });

  const interviewerSystemPrompt = interviewAgentSystemPrompt({
    brief: project.brief,
    optimizedQuestions: project.extra?.optimizedQuestions,
    isPersonaInterview: true,
    personaName: persona.name,
    locale,
  });

  const personaSystemPrompt = personaAgentSystem({ persona, locale });

  logger.info({
    msg: "Starting auto persona interview",
    personaName: persona.name,
    maxTurns: MAX_CONVERSATION_TURNS,
  });

  const saveParams = { userChatId, backgroundToken, logger };

  try {
    let conversationTurns = 0;
    let lastSpeaker: "interviewer" | "persona" = "persona"; // Start with interviewer
    const interviewerAgent = {
      messages: [
        { id: generateId(), role: "user", parts: [{ type: "text", text: "[READY]" }] },
      ] as UIMessage[],
    };
    const personaAgent = {
      messages: [] as UIMessage[],
    };

    while (conversationTurns < MAX_CONVERSATION_TURNS) {
      // Check if another process took over (background token changed)
      const currentUserChat = await prisma.userChat.findUnique({
        where: { id: userChatId },
        select: { backgroundToken: true },
      });

      if (currentUserChat?.backgroundToken !== backgroundToken) {
        logger.info("Background token changed, stopping auto interview");
        return;
      }

      // Determine who should speak next
      const shouldEndInterview = conversationTurns >= MAX_CONVERSATION_TURNS - 2;

      if (lastSpeaker === "interviewer") {
        // Persona's turn to respond
        const messaage = await generatePersonaResponse({
          systemPrompt: personaSystemPrompt,
          messages: personaAgent.messages,
          interviewSessionId: sessionId,
          statReport,
          logger,
        });
        fixEmptyTextIssue(messaage);
        await saveMessage({ message: { ...messaage, role: "user" }, ...saveParams });
        interviewerAgent.messages.push({ ...messaage, role: "user" });
        personaAgent.messages.push({ ...messaage, role: "assistant" });
        lastSpeaker = "persona";
      } else {
        // Interviewer's turn to respond
        const messaage = await generateInterviewerResponse({
          systemPrompt: interviewerSystemPrompt,
          messages: interviewerAgent.messages,
          shouldEndInterview,
          interviewSessionId: sessionId,
          statReport,
          logger,
        });
        fixEmptyTextIssue(messaage);
        await saveMessage({ message: { ...messaage, role: "assistant" }, ...saveParams });
        interviewerAgent.messages.push({ ...messaage, role: "assistant" });
        personaAgent.messages.push({ ...messaage, role: "user" });
        lastSpeaker = "interviewer";
      }

      conversationTurns++;

      // Add delay between responses to simulate natural conversation
      // await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if interview was ended by interviewer
      const lastMessage = (
        await prisma.chatMessage.findMany({
          where: { userChatId },
          orderBy: { createdAt: "desc" },
          take: 1,
        })
      ).map(convertDBMessageToAIMessage)[0] as TInterviewMessageWithTool | undefined;

      if (
        lastMessage?.parts &&
        lastMessage.parts.some((part) => part.type === `tool-${InterviewToolName.endInterview}`)
      ) {
        logger.info({
          msg: "Interview ended by interviewer tool",
          messageId: lastMessage.id,
          content:
            lastMessage.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("\n")
              .substring(0, 100) + "...",
        });
        break;
      }

      // Log conversation progress
      logger.info({
        msg: "Conversation turn completed",
        turn: conversationTurns,
        lastSpeaker,
        maxTurns: MAX_CONVERSATION_TURNS,
      });
    }

    logger.info({
      msg: "Auto persona interview completed",
      totalTurns: conversationTurns,
    });
  } catch (error) {
    logger.error(`Fatal error in auto persona interview: ${(error as Error).message}`);
    throw error;
  } finally {
    // Clear background token when done
    try {
      await prisma.userChat.update({
        where: { id: userChatId, kind: "interviewSession", backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      logger.error(
        `Error clearing background token ${backgroundToken}: ${(error as Error).message}`,
      );
    }
  }
}

async function generatePersonaResponse({
  systemPrompt,
  messages,
  interviewSessionId,
  statReport,
  logger,
}: {
  systemPrompt: string;
  messages: UIMessage[];
  interviewSessionId: number;
  statReport: StatReporter;
  logger: Logger;
}) {
  const promise = new Promise<Omit<UIMessage, "role">>((resolve, reject) => {
    const streamTextPromise = streamText({
      model: llm("gemini-2.5-flash"),
      providerOptions: defaultProviderOptions,
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0.3, // threshold 越小，使用搜索的可能性就越高
        }),
      },

      system: systemPrompt,
      messages: convertToModelMessages(messages, {
        tools: {},
      }),
      stopWhen: stepCountIs(1),

      onStepFinish: async ({ usage, toolCalls }) => {
        logger.info({
          msg: "generatePersonaResponse streamText onStepFinish",
          toolCalls: toolCalls.map((call) => call.toolName),
          usage: usage,
        });
        if (usage.totalTokens && usage.totalTokens > 0) {
          const tokens = usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "persona interview session",
            interviewSessionId,
            role: "interviewer",
            usage: usage,
          };
          await statReport("tokens", tokens, extra);
        }
      },

      onFinish: ({ steps, usage }) => {
        logger.info({ msg: "generatePersonaResponse streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },

      onError: ({ error }) => {
        logger.error(`generatePersonaResponse streamText onError: ${(error as Error).message}`);
        reject(error);
      },
    });
    streamTextPromise.consumeStream().catch((error) => reject(error));
  });
  return await promise;
}

async function generateInterviewerResponse({
  systemPrompt,
  messages,
  shouldEndInterview,
  interviewSessionId,
  statReport,
  logger,
}: {
  systemPrompt: string;
  messages: UIMessage[];
  shouldEndInterview: boolean;
  interviewSessionId: number;
  statReport: StatReporter;
  logger: Logger;
}) {
  // persona 访谈只使用 endInterview
  const { endInterview } = interviewSessionTools({
    interviewSessionId,
  });
  const tools = {
    endInterview,
  };
  const promise = new Promise<Omit<UIMessage, "role">>((resolve, reject) => {
    const streamTextPromise = streamText({
      model: llm("claude-3-7-sonnet"),

      providerOptions: {
        ...defaultProviderOptions,
      },

      system: systemPrompt,
      messages: convertToModelMessages(messages, {
        tools,
      }),

      toolChoice: shouldEndInterview
        ? { type: "tool", toolName: InterviewToolName.endInterview }
        : "auto",

      tools,

      stopWhen: stepCountIs(1),

      onStepFinish: async ({ usage, toolCalls }) => {
        logger.info({
          msg: "generateInterviewerResponse streamText onStepFinish",
          toolCalls: toolCalls.map((call) => call.toolName),
          usage: usage,
        });
        if (usage.totalTokens && usage.totalTokens > 0) {
          const tokens = usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "persona interview session",
            interviewSessionId,
            role: "interviewer",
            usage: usage,
          };
          await statReport("tokens", tokens, extra);
        }
      },

      onFinish: ({ steps, usage }) => {
        logger.info({ msg: "generateInterviewerResponse streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },

      onError: ({ error }) => {
        logger.error(`generateInterviewerResponse streamText onError: ${(error as Error).message}`);
        reject(error);
      },
    });
    streamTextPromise.consumeStream().catch((error) => reject(error));
  });
  return await promise;
}
