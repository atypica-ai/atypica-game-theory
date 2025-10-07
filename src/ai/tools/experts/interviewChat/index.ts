import "server-only";

import { convertStepsToAIMessage, persistentAIMessageToDB } from "@/ai/messageUtils";
import {
  interviewDigestSystem,
  interviewerAttachment,
  interviewerPrologue,
  interviewerSystem,
  personaAgentSystem,
} from "@/ai/prompt";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import {
  dySearchTool,
  insSearchTool,
  reasoningThinkingTool,
  saveInterviewConclusionTool,
  tiktokSearchTool,
  twitterSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { createUserChat } from "@/lib/userChat/lib";
import { ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  FileUIPart,
  generateId,
  generateText,
  ModelMessage,
  stepCountIs,
  streamText,
  tool,
  ToolChoice,
  UIMessage,
} from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import {
  interviewChatInputSchema,
  interviewChatOutputSchema,
  type InterviewChatResult,
} from "./types";

const MAX_MESSAGES_LIMIT = 14; // 访谈双方消息总数限制，到达之后必须 saveInterviewConclusion
type TReduceTokens = {
  // model: llm("gemini-2.5-pro"), // 不能这么写，一定要下面每次都重新初始化 llm，不然会卡住
  model: LLMModelName;
  ratio: number;
} | null;

export const interviewChatTool = ({
  userId,
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Conduct in-depth user interviews by having expert agents interview user persona agents to understand decision-making patterns, preferences, and behavioral insights for the study topic",
    inputSchema: interviewChatInputSchema,
    outputSchema: interviewChatOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ personas, instruction }): Promise<InterviewChatResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: { analyst: { select: { id: true } } },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      const single = async ({
        id: personaId,
        name,
      }: {
        id: number;
        name: string;
      }): Promise<{ name: string; issue: string } | { name: string; conclusion: string }> => {
        try {
          const interview = await prisma.analystInterview.findUnique({
            where: { analystId_personaId: { analystId, personaId } },
          });
          // 不重复访谈
          if (interview?.conclusion) {
            return {
              name,
              conclusion: interview.conclusion,
            };
          }
          const { analystInterviewId, interviewUserChatId, prompt, attachments } =
            await prepareDBForInterview({
              userId,
              personaId,
              analystId,
              instruction,
              locale,
            });
          const interviewLog = logger.child({ interviewUserChatId, analystInterviewId });
          const mergedAbortSignal = AbortSignal.any([
            abortSignal,
            AbortSignal.timeout(10 * 60 * 1000), // 10 分钟超时
          ]);
          await runInterview({
            locale,
            analystInterviewId,
            interviewUserChatId,
            prompt,
            attachments,
            abortSignal: mergedAbortSignal,
            statReport,
            logger: interviewLog,
          });
          const updatedInterview = await prisma.analystInterview.findUniqueOrThrow({
            where: { id: analystInterviewId },
          });
          return {
            name,
            conclusion: updatedInterview.conclusion,
          };
        } catch (error) {
          return {
            name,
            issue: `Interview encountered an issue: ${(error as Error).message}`,
          };
        }
      };
      const interviewResults = await Promise.all(personas.map(single));
      const digest = await generateDigest(locale, interviewResults);
      return {
        issues: interviewResults.filter((result) => "issue" in result),
        plainText: digest,
      };
    },
  });

/**
 * - 这里没有统计 tokens，模型便宜问题不大
 * - 这里也没有 abortSignal, 所以在研究被人工 abort 了以后 (tool 会先停止，然后是 study)，有一定概率会出现 interview 中断自动跳过开始进行 generateDigest，
 *   最后 study 还是有访谈总结，这样挺好的。。。
 */
async function generateDigest(
  locale: Locale,
  results: ({ name: string; issue: string } | { name: string; conclusion: string })[],
) {
  const digest = await generateText({
    // model: llm("gpt-4.1-nano"),
    model: llm("gpt-4.1-mini"),
    providerOptions: defaultProviderOptions,
    prompt: interviewDigestSystem({ locale, results }),
    maxOutputTokens: 2000,
  });
  return digest.text;
}

export async function prepareDBForInterview({
  userId,
  personaId,
  analystId,
  instruction,
  locale,
}: {
  userId: number;
  personaId: number;
  analystId: number;
  instruction: string;
  locale: Locale;
}) {
  const [persona, analyst] = await Promise.all([
    prisma.persona.findUniqueOrThrow({ where: { id: personaId } }),
    prisma.analyst.findUniqueOrThrow({ where: { id: analystId } }),
  ]);
  const personaPrompt = personaAgentSystem({ persona, locale });
  const interviewerPrompt = interviewerSystem({ analyst, instruction, locale });
  const interviewerProloguePrompt = interviewerPrologue({ analyst, locale });
  const interviewerAttachmentPrompt = interviewerAttachment({ persona, locale });
  const attachments = analyst.attachments
    ? (analyst.attachments as ChatMessageAttachment[])
    : undefined;
  const conclusion = ""; // conclusion 被用于判断是否结束，开始前一定要清空
  const interview = await prisma.analystInterview.upsert({
    where: {
      analystId_personaId: { analystId, personaId },
    },
    update: { instruction, conclusion },
    create: { analystId, personaId, instruction, conclusion },
  });
  let interviewUserChatId = interview.interviewUserChatId;
  if (!interviewUserChatId) {
    const interviewUserChat = await createUserChat({
      userId,
      title: analyst.topic.substring(0, 50),
      kind: "interview",
    });
    interviewUserChatId = interviewUserChat.id;
    await prisma.analystInterview.update({
      where: { id: interview.id },
      data: { interviewUserChatId },
    });
  } else {
    // 否则需要先清空现在的聊天记录
    await prisma.chatMessage.deleteMany({
      where: { userChatId: interviewUserChatId },
    });
  }
  return {
    analystInterviewId: interview.id,
    interviewUserChatId,
    prompt: {
      personaPrompt,
      interviewerPrompt,
      interviewerProloguePrompt,
      interviewerAttachmentPrompt,
    },
    attachments,
  };
}

type ChatProps = {
  analystInterviewId: number;
  interviewUserChatId: number;
  prompt: {
    personaPrompt: string;
    interviewerPrompt: string;
    interviewerProloguePrompt: string;
    interviewerAttachmentPrompt: string;
  };
  attachments?: ChatMessageAttachment[];
} & AgentToolConfigArgs;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    ">=1": false,
    ">=4": false,
    ">=8": false,
    ">=16": false, // 这个应该是到不了的
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = { bedrock: { cachePoint: { type: "default" } } };
    if (message.role === "assistant" && index >= 1 && !checkpoints[">=1"]) {
      checkpoints[">=1"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 4 && !checkpoints[">=4"]) {
      checkpoints[">=4"] = true;
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

async function chatWithInterviewer(chatProps: ChatProps, messages: UIMessage[]) {
  const {
    locale,
    analystInterviewId,
    prompt: { interviewerPrompt },
    abortSignal,
    statReport,
    logger,
  } = chatProps;
  const hasAttachments = !!messages.find(
    (message) => message.parts.some((part) => part.type === "file"),
    // (message) => (message.experimental_attachments ?? []).length > 0,
  );
  const reduceTokens: TReduceTokens = hasAttachments
    ? { model: "gemini-2.5-flash", ratio: 10 }
    : { model: "gemini-2.5-flash", ratio: 10 };
  // : { model: "gpt-4.1-mini", ratio: 10 }; // 总结的不好
  // : { model: "grok-3-mini", ratio: 10 }; // 总结的不好

  // gpt 无法使用 pdf 文件，claude 和 gemini 可以, 并且，3.7 比较消耗 tokens，改用 gemini 和 gpt 吧
  // null as TReduceTokens;
  // const coreMessages = setBedrockCache("claude-3-7-sonnet", convertToCoreMessages(messages));
  const tools = {
    [ToolName.reasoningThinking]: reasoningThinkingTool({
      locale,
      abortSignal,
      statReport,
      logger,
    }),
    [ToolName.saveInterviewConclusion]: saveInterviewConclusionTool(analystInterviewId),
  };
  const coreMessages = convertToModelMessages(messages, {
    tools,
  });
  let toolChoice: ToolChoice<typeof tools> = "auto";
  let maxSteps = 2;
  if (coreMessages.length >= MAX_MESSAGES_LIMIT) {
    toolChoice = {
      type: "tool",
      toolName: ToolName.saveInterviewConclusion,
    };
    maxSteps = 1;
  }
  if (coreMessages.length >= MAX_MESSAGES_LIMIT + 4) {
    // LLM 始终没有 saveInterviewConclusion, 强制退出
    throw new Error("Interview exceeded maximum message limit and failed to conclude properly");
  }
  const streamTextPromise = new Promise<Omit<UIMessage, "role">>(async (resolve, reject) => {
    const response = streamText({
      model: reduceTokens
        ? llm(reduceTokens.model)
        : // gpt-4.1 系列都不支持 pdf，目前只有 gemini 和 claude 支持
          llm("claude-3-7-sonnet"),

      providerOptions: defaultProviderOptions,

      // maxRetries: 0, // 不要自动重试？不，gemini 偶尔连不上，还是得自动重试，慢是慢了点
      system: interviewerPrompt,

      temperature: 0.3,
      messages: coreMessages,
      tools,
      toolChoice,
      stopWhen: stepCountIs(maxSteps),

      onStepFinish: async ({ usage, toolCalls, ...step }) => {
        const cache = step.providerMetadata?.bedrock?.usage as
          | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
          | undefined;
        logger.info({
          msg: "chatWithInterviewer streamText onStepFinish",
          toolCalls: toolCalls.map((call) => call.toolName),
          usage,
          cache,
        });
        if (usage.totalTokens && usage.totalTokens > 0) {
          let tokens =
            usage.totalTokens +
            Math.floor((cache?.cacheReadInputTokens || 0) / 10) +
            Math.floor((cache?.cacheWriteInputTokens || 0) * 1.25);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "interview tool",
            analystInterviewId,
            role: "interviewer",
            usage,
            cache,
          };
          if (reduceTokens) {
            extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens }; // originalTokens 用于 admin 后台计算省下的 tokens
            tokens = Math.ceil(tokens / reduceTokens.ratio);
          }
          await statReport("tokens", tokens, extra);
        }
      },

      onFinish: async ({ steps, usage }) => {
        logger.info({ msg: "chatWithInterviewer streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },

      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`chatWithInterviewer streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`chatWithInterviewer streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },

      abortSignal,
    });
    // abortSignal 发生了以后，会进 consumeStream 的 then 而不是 catch，
    // 由于 abort 了以后就不会触发 onFinish，如果这里不 resolve/reject 就会导致 promise 一直不退出
    // 所以对于放进 promise 里的 streamText，除了设置 abortSignal 还需要单独监听 abortSignal 并 reject
    abortSignal.addEventListener("abort", () => {
      // 如果前面已经 resolve 了，这里 eventListener 不需要取消，reject 会被忽略
      reject(new Error("chatWithInterviewer abortSignal received"));
    });
    // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
    // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
    // 必须写这个 await for loop，把 stream 消费完，也可以使用 consumeStream 方法
    // for await (const textPart of response.textStream) { console.log(textPart); }
  });
  const message = await streamTextPromise;
  return message;
}

async function chatWithPersona(chatProps: ChatProps, messages: UIMessage[]) {
  const {
    analystInterviewId,
    prompt: { personaPrompt },
    abortSignal,
    statReport,
    logger,
  } = chatProps;

  const reduceTokens: TReduceTokens = { model: "gemini-2.5-flash", ratio: 10 };
  const tools = {
    [ToolName.tiktokSearch]: tiktokSearchTool,
    [ToolName.dySearch]: dySearchTool,
    [ToolName.insSearch]: insSearchTool,
    [ToolName.twitterSearch]: twitterSearchTool,
    // [ToolName.xhsSearch]: xhsSearchTool, // 因为有 grounding 了，tools 可以去掉一些
    ...(reduceTokens && reduceTokens.model.startsWith("gemini")
      ? {
          google_search: google.tools.googleSearch({
            mode: "MODE_DYNAMIC",
            // threshold 越小，使用搜索的可能性就越高
            dynamicThreshold: messages.length <= 2 ? 0.1 : messages.length <= 4 ? 0.3 : 0.5,
          }),
        }
      : {}),
  };

  const streamTextPromise = new Promise<Omit<UIMessage, "role">>(async (resolve, reject) => {
    // const hasAttachments = !!messages.find((message) => (message.experimental_attachments ?? []).length > 0);
    const response = streamText({
      // gpt 4.1 不支持 pdf，目前只有 gemini 和 claude 支持
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),

      providerOptions: defaultProviderOptions,
      system: personaPrompt,

      // maxRetries: 0,  // 不要自动重试？不，gemini 偶尔连不上，还是得自动重试，慢是慢了点
      temperature: 0.3,

      messages: convertToModelMessages(messages, {
        tools,
      }),

      tools,

      stopWhen: stepCountIs(2),

      onStepFinish: async (step) => {
        logger.info({
          msg: "chatWithPersona streamText onStepFinish",
          toolCalls: step.toolCalls.map((call) => call?.toolName ?? "unknown"),
          usage: step.usage,
        });
        if (step.usage.totalTokens && step.usage.totalTokens > 0) {
          let tokens = step.usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "interview tool",
            analystInterviewId,
            role: "persona",
            usage: step.usage,
          };
          if (reduceTokens) {
            extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
            tokens = Math.ceil(tokens / reduceTokens.ratio);
          }
          await statReport("tokens", tokens, extra);
        }
      },

      onFinish: ({ steps, usage }) => {
        logger.info({ msg: "chatWithPersona streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },

      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`chatWithPersona streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`chatWithPersona streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },

      abortSignal,
    });
    abortSignal.addEventListener("abort", () => {
      reject(new Error("chatWithPersona abortSignal received"));
    });
    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });
  const message = await streamTextPromise;
  return message;
}

async function saveMessage({
  message,
  // analystInterviewId,
  interviewUserChatId,
  backgroundToken,
  logger,
}: {
  message: UIMessage;
  analystInterviewId: number;
  interviewUserChatId: number;
  backgroundToken: string;
  logger: Logger;
}) {
  try {
    // const { id: messageId, role, content, parts: _parts } = message;
    // const parts = _parts?.length ? _parts : [{ type: "text", text: content }];
    await prisma.$transaction(async (tx) => {
      // 先确保 backgroundToken 是当前的
      await tx.userChat.findUniqueOrThrow({
        where: { id: interviewUserChatId, kind: "interview", backgroundToken },
      });
      await persistentAIMessageToDB(interviewUserChatId, message);
    });
  } catch (error) {
    logger.error(
      `Error saving interview messages with token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

export async function runInterview(chatProps: ChatProps) {
  const { analystInterviewId, interviewUserChatId, prompt, attachments, logger } = chatProps;
  const backgroundToken = new Date().valueOf().toString();
  await prisma.userChat.update({
    where: { id: interviewUserChatId, kind: "interview" },
    data: { backgroundToken },
  });
  const fileParts: FileUIPart[] = await Promise.all(
    (attachments ?? []).map(async ({ name, objectUrl, mimeType }: ChatMessageAttachment) => {
      const url = await fileUrlToDataUrl({ objectUrl, mimeType });
      return { type: "file", filename: name, url, mediaType: mimeType };
    }),
  );
  const personaAgent = {
    messages: [
      {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: prompt.interviewerProloguePrompt }, ...fileParts],
      },
    ] as UIMessage[],
  };
  const interviewer = {
    messages: (fileParts.length
      ? [
          {
            id: generateId(),
            role: "user",
            parts: [{ type: "text", text: prompt.interviewerAttachmentPrompt }, ...fileParts],
          },
        ]
      : []) as UIMessage[],
  };
  const saveParams = { analystInterviewId, interviewUserChatId, backgroundToken, logger };

  while (true) {
    const personaReply = await chatWithPersona(chatProps, personaAgent.messages);
    fixEmptyTextIssue(personaReply);
    // logger.info(`Persona:\n${message.content}\n`);
    await saveMessage({ message: { ...personaReply, role: "assistant" }, ...saveParams });
    personaAgent.messages.push({ ...personaReply, role: "assistant" });
    interviewer.messages.push({ ...personaReply, role: "user" });

    const interviewerReply = await chatWithInterviewer(chatProps, interviewer.messages);
    fixEmptyTextIssue(interviewerReply);
    // logger.info(`Interviewer:\n${message.content}\n`);
    await saveMessage({ message: { ...interviewerReply, role: "user" }, ...saveParams });
    interviewer.messages.push({ ...interviewerReply, role: "assistant" });
    personaAgent.messages.push({ ...interviewerReply, role: "user" });

    const _updated = await prisma.analystInterview.findUnique({
      where: { id: analystInterviewId },
    });
    // if (interviewerReply.content.includes("本次访谈结束")) {
    // 不匹配 “谢谢您的参与！”，因为会出现人设是个双人组合，AI 就会回复“谢谢你们的参与”。。。
    // 其实检查一下 conclusion 就行了
    if (_updated?.conclusion) {
      break;
    }
  }

  try {
    await prisma.userChat.update({
      where: { id: interviewUserChatId, kind: "interview", backgroundToken },
      data: { backgroundToken: null },
    });
  } catch (error) {
    logger.error(
      `Error clearing interview session token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

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
