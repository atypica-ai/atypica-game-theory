import "server-only";

import { convertStepsToAIMessage } from "@/ai/messageUtils";
import {
  interviewDigestSystem,
  interviewerAttachment,
  interviewerPrologue,
  interviewerSystem,
  personaAgentSystem,
} from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import {
  dySearchTool,
  insSearchTool,
  reasoningThinkingTool,
  saveInterviewConclusionTool,
  tiktokSearchTool,
} from "@/ai/tools/tools";
import { InterviewChatResult, PlainTextToolResult, StatReporter, ToolName } from "@/ai/tools/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { ChatMessageAttachment } from "@/lib/attachments/types";
import { fixMalformedUnicodeString, generateToken } from "@/lib/utils";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId, generateText, Message, streamText, tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";

export const interviewChatTool = ({
  userId,
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  studyUserChatId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description:
      "Conduct in-depth user interviews by having expert agents interview user persona agents to understand decision-making patterns, preferences, and behavioral insights for the study topic",
    parameters: z.object({
      personas: z
        .array(
          z.object({
            id: z.number().describe("The personaId value from previously built or found personas"),
            name: z.string().describe("Display name of the persona corresponding to the personaId"),
          }),
        )
        .max(5)
        .describe(
          "List of study participants (maximum 5). Must use personas that have been built or found in the current study - do not create fictional ones",
        ),
      instruction: z
        .string()
        .describe(
          "Interview focus and specific questions or topics to explore based on the study objectives",
        )
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
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
          const interviewLog = studyLog.child({ interviewUserChatId, analystInterviewId });
          await runInterview({
            locale,
            analystInterviewId,
            interviewUserChatId,
            prompt,
            attachments,
            abortSignal,
            statReport,
            interviewLog,
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
    model: llm("gpt-4.1-nano"),
    providerOptions,
    prompt: interviewDigestSystem({ locale, results }),
    maxTokens: 2000,
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
    const interviewUserChat = await prisma.userChat.create({
      data: {
        userId,
        token: generateToken(),
        title: analyst.topic.substring(0, 50),
        kind: "interview",
      },
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
  locale: Locale;
  analystInterviewId: number;
  interviewUserChatId: number;
  prompt: {
    personaPrompt: string;
    interviewerPrompt: string;
    interviewerProloguePrompt: string;
    interviewerAttachmentPrompt: string;
  };
  attachments?: ChatMessageAttachment[];
  abortSignal: AbortSignal;
  statReport: StatReporter;
  interviewLog: Logger;
};

async function chatWithInterviewer(chatProps: ChatProps, messages: Message[]) {
  const {
    locale,
    analystInterviewId,
    prompt: { interviewerPrompt },
    abortSignal,
    statReport,
    interviewLog,
  } = chatProps;

  const REDUCE_TOKENS = {
    // model: llm("gemini-2.5-pro"), // 不能这么写，一定要下面每次都重新初始化 llm，不然会卡住
    // model: "gemini-2.5-pro" as LLMModelName,
    // ratio: 2,
    model: "gpt-4.1-mini" as LLMModelName,
    ratio: 5,
  };

  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const reduceTokens = REDUCE_TOKENS as typeof REDUCE_TOKENS | null;
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"), // 不能用 gpt-4o，指令遵循的比较差，会结束不了
      providerOptions: providerOptions,
      maxRetries: 0, // 不要自动重试
      system: interviewerPrompt,
      temperature: 0.3,
      messages: messages,
      tools: {
        [ToolName.reasoningThinking]: reasoningThinkingTool({ locale, abortSignal, statReport }),
        [ToolName.saveInterviewConclusion]: saveInterviewConclusionTool(analystInterviewId),
      },
      ...(messages.length < 10
        ? {
            toolChoice: "auto",
            maxSteps: 2,
          }
        : {
            toolChoice: {
              type: "tool",
              toolName: ToolName.saveInterviewConclusion,
            },
            maxSteps: 1,
          }),
      onStepFinish: async (step) => {
        interviewLog.info({
          msg: "Expert interviewer step completed",
          stepType: step.stepType,
          toolCalls: step.toolCalls.map((call) => call.toolName),
          usage: step.usage,
        });
        if (step.usage.totalTokens > 0) {
          let tokens = step.usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "interview tool",
            analystInterviewId,
            role: "interviewer",
          };
          if (reduceTokens) {
            extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
            tokens = Math.ceil(tokens / reduceTokens.ratio);
          }
          await statReport("tokens", tokens, extra);
        }
      },
      onFinish: async ({ steps, usage }) => {
        interviewLog.info({ msg: "Expert interviewer stream completed", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        interviewLog.error(`Expert interviewer stream error: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
    // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
    response.consumeStream().catch((error) => reject(error));
    // 必须写这个 await for loop，把 stream 消费完，也可以使用 consumeStream 方法
    // for await (const textPart of response.textStream) { console.log(textPart); }
  });
  return result;
}

async function chatWithPersona(chatProps: ChatProps, messages: Message[]) {
  const {
    analystInterviewId,
    prompt: { personaPrompt },
    abortSignal,
    statReport,
    interviewLog,
  } = chatProps;

  const REDUCE_TOKENS = {
    // model: llm("gemini-2.5-flash"), // 不能这么写，一定要下面每次都重新初始化 llm，不然会卡住
    model: "gemini-2.5-flash" as LLMModelName,
    ratio: 10,
  };

  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const reduceTokens = REDUCE_TOKENS as typeof REDUCE_TOKENS | null;
    const response = streamText({
      model: reduceTokens
        ? llm(reduceTokens.model, {
            useSearchGrounding: true,
            dynamicRetrievalConfig: {
              mode: "MODE_DYNAMIC",
              dynamicThreshold: 0.5,
            },
          })
        : llm("gpt-4.1"),
      providerOptions: providerOptions,
      system: personaPrompt,
      // maxRetries: 0, // 不要自动重试
      temperature: 0.3,
      messages: messages,
      tools: {
        [ToolName.tiktokSearch]: tiktokSearchTool,
        [ToolName.dySearch]: dySearchTool,
        [ToolName.insSearch]: insSearchTool,
        // [ToolName.xhsSearch]: xhsSearchTool, // 因为有 grounding 了，tools 可以去掉一些
      },
      maxSteps: 2,
      onStepFinish: async (step) => {
        interviewLog.info({
          msg: "User persona interview step completed",
          stepType: step.stepType,
          toolCalls: step.toolCalls.map((call) => call.toolName),
          usage: step.usage,
        });
        if (step.usage.totalTokens > 0) {
          let tokens = step.usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = { reportedBy: "interview tool", analystInterviewId, role: "persona" };
          if (reduceTokens) {
            extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
            tokens = Math.ceil(tokens / reduceTokens.ratio);
          }
          await statReport("tokens", tokens, extra);
        }
      },
      onFinish: ({ steps, usage }) => {
        interviewLog.info({ msg: "User persona interview stream completed", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        interviewLog.error(`User persona interview stream error: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
    // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
    response.consumeStream().catch((error) => reject(error));
  });
  return result;
}

async function saveMessage({
  message,
  // analystInterviewId,
  interviewUserChatId,
  backgroundToken,
  interviewLog,
}: {
  message: Message;
  analystInterviewId: number;
  interviewUserChatId: number;
  backgroundToken: string;
  interviewLog: Logger;
}) {
  try {
    const { id: messageId, role, content, parts: _parts } = message;
    const parts = _parts?.length ? _parts : [{ type: "text", text: content }];
    await prisma.$transaction([
      // 先确保 backgroundToken 是当前的
      prisma.userChat.findUniqueOrThrow({
        where: { id: interviewUserChatId, kind: "interview", backgroundToken },
      }),
      prisma.chatMessage.create({
        data: {
          userChatId: interviewUserChatId,
          messageId,
          role,
          content,
          parts: parts as InputJsonValue,
        },
      }),
    ]);
  } catch (error) {
    interviewLog.error(
      `Error saving interview messages with token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

export async function runInterview(chatProps: ChatProps) {
  const { analystInterviewId, interviewUserChatId, prompt, attachments, interviewLog } = chatProps;
  const backgroundToken = new Date().valueOf().toString();
  await prisma.userChat.update({
    where: { id: interviewUserChatId, kind: "interview" },
    data: { backgroundToken },
  });
  const experimental_attachments = attachments
    ? await Promise.all(
        attachments.map(async ({ objectUrl, name, mimeType }) => ({
          url: await s3SignedUrl(objectUrl),
          name: name,
          contentType: mimeType,
        })),
      )
    : undefined;
  const personaAgent = {
    messages: [
      {
        id: generateId(),
        role: "user",
        content: prompt.interviewerProloguePrompt,
        experimental_attachments,
      },
    ] as Message[],
  };
  const interviewer = {
    messages: (experimental_attachments
      ? [
          {
            id: generateId(),
            role: "user",
            content: prompt.interviewerAttachmentPrompt,
            experimental_attachments,
          },
        ]
      : []) as Message[],
  };
  const saveParams = { analystInterviewId, interviewUserChatId, backgroundToken, interviewLog };

  while (true) {
    const personaReply = await chatWithPersona(chatProps, personaAgent.messages);
    fixEmptyTextIssue(personaReply);
    // interviewLog.info(`Persona:\n${message.content}\n`);
    await saveMessage({ message: { ...personaReply, role: "assistant" }, ...saveParams });
    personaAgent.messages.push({ ...personaReply, role: "assistant" });
    interviewer.messages.push({ ...personaReply, role: "user" });

    const interviewerReply = await chatWithInterviewer(chatProps, interviewer.messages);
    fixEmptyTextIssue(interviewerReply);
    // interviewLog.info(`Interviewer:\n${message.content}\n`);
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
    interviewLog.error(
      `Error clearing interview session token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

function fixEmptyTextIssue(message: Omit<Message, "role">) {
  // 有时候 personaReply 或 interviewerReply 的 content 是空的，这时候一般是调用了一次工具但还没有文本回复
  // 由于 interviewer 的 assistant 消息会转换成 user 消息给 persona，反过来也是一样，user role message 转换成 coreMessage 的时候，tool 的内容会被忽略，这样就产生了一条空消息，没意义
  // 还没太好的解决方案，有一种方案就是让 interviewer 或者 persona 继续生成，直到输出文本，然后再让另一方继续
  for (const part of message.parts ?? []) {
    if (part.type === "text" && !part.text.trim()) {
      part.text = "[CONTINUE]";
    }
  }
  if (!message.content) {
    message.content = "[CONTINUE]";
  }
}
