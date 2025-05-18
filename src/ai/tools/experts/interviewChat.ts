import { llm, LLMModelName, providerOptions } from "@/ai/llm";
import { convertStepsToAIMessage } from "@/ai/messageUtils";
import { interviewerPrologue, interviewerSystem, personaAgentSystem } from "@/ai/prompt";
import {
  dySearchTool,
  insSearchTool,
  PlainTextToolResult,
  reasoningThinkingTool,
  saveInterviewConclusionTool,
  StatReporter,
  tiktokSearchTool,
  ToolName,
  xhsSearchTool,
} from "@/ai/tools";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { fixMalformedUnicodeString, generateToken } from "@/lib/utils";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId, generateText, Message, streamText, tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";

export interface InterviewChatResult extends PlainTextToolResult {
  // interviews: {
  //   analystId: number;
  //   persona: {
  //     id: number;
  //     name: string;
  //   };
  //   // personaId: number;
  //   // personaName: string;
  //   // conclusion?: string;  // 不再返回 conclusion，study agent 用不到
  //   result: string;
  // }[];
  plainText: string;
}

export const interviewChatTool = ({
  userId,
  studyUserChatId,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  studyUserChatId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description: "针对一个研究主题的一系列用户进行访谈，每次最多5人",
    parameters: z.object({
      personas: z
        .array(
          z.object({
            id: z.number().describe("用户智能体（用户画像）的personaId"),
            name: z.string().describe("personaId 对应的用户智能体的名字"),
          }),
        )
        .describe("调研对象的列表，最多5，必须使用本次研究总结或搜索到的用户，不能编造"),
      instruction: z
        .string()
        .describe("在研究主题的基础上，本次访谈的具体需求")
        .transform(fixMalformedUnicodeString),
      language: z
        .string()
        .optional()
        .describe("访谈使用的语言")
        .transform(fixMalformedUnicodeString)
        .default(() => (getDeployRegion() === "mainland" ? "简体中文" : "English")),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ personas, instruction, language }): Promise<InterviewChatResult> => {
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
              // issue: "和该用户的访谈在",
            };
          }
          const { analystInterviewId, interviewUserChatId, prompt } = await prepareDBForInterview({
            userId,
            personaId,
            analystId,
            instruction,
            language,
          });
          const interviewLog = studyLog.child({ interviewUserChatId, analystInterviewId });
          await runInterview({
            analystInterviewId,
            interviewUserChatId,
            prompt,
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
            issue: `访谈遇到问题 ${(error as Error).message}`,
          };
        }
      };
      const interviewResults = await Promise.all(personas.map(single));
      const digest = await generateDigest(interviewResults);
      return {
        plainText: digest,
      };
    },
  });

async function generateDigest(
  results: ({ name: string; issue: string } | { name: string; conclusion: string })[],
) {
  // 注意，这里没有统计 tokens，模型便宜问题不大
  const prompt = `
请根据以下访谈结果生成一份简单的摘要，不超过200字。
${results
  .map((result) => {
    const text = "conclusion" in result ? result.conclusion : "issue" in result ? result.issue : "";
    return `${result.name}\n${text}\n`;
  })
  .join("\n")}
`;
  const digest = await generateText({
    model: llm("gpt-4o-mini"),
    providerOptions,
    prompt,
    maxTokens: 2000,
  });
  return digest.text;
}

export async function prepareDBForInterview({
  userId,
  personaId,
  analystId,
  instruction,
  language,
}: {
  userId: number;
  personaId: number;
  analystId: number;
  instruction: string;
  language: string;
}) {
  const [persona, analyst] = await Promise.all([
    prisma.persona.findUniqueOrThrow({ where: { id: personaId } }),
    prisma.analyst.findUniqueOrThrow({ where: { id: analystId } }),
  ]);
  const personaPrompt = personaAgentSystem({ persona, language });
  const interviewerPrompt = interviewerSystem({ analyst, language, instruction });
  const interviewerProloguePrompt = interviewerPrologue({ analyst, language });
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
    },
  };
}

type ChatProps = {
  messages: Message[];
  analystInterviewId: number;
  interviewUserChatId: number;
  backgroundToken: string;
  prompt: {
    personaPrompt: string;
    interviewerPrompt: string;
    interviewerProloguePrompt: string;
  };
  abortSignal: AbortSignal;
  statReport: StatReporter;
  interviewLog: Logger;
};

async function chatWithInterviewer({
  messages,
  analystInterviewId,
  prompt,
  abortSignal,
  statReport,
  interviewLog,
}: Pick<
  ChatProps,
  "messages" | "analystInterviewId" | "prompt" | "abortSignal" | "statReport" | "interviewLog"
>) {
  const REDUCE_TOKENS: {
    model: LLMModelName;
    ratio: number;
  } = {
    model: "gemini-2.5-pro",
    ratio: 2,
  };

  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const reduceTokens = REDUCE_TOKENS as typeof REDUCE_TOKENS | null;
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"), // 不能用 gpt-4o，指令遵循的比较差，会结束不了
      providerOptions: providerOptions,
      system: prompt.interviewerPrompt,
      temperature: 0.5,
      messages: messages,
      tools: {
        [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
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
          msg: "chatWithInterviewer streamText onStepFinish",
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
        interviewLog.info({ msg: "chatWithInterviewer streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        interviewLog.error(`chatWithInterviewer streamText onError: ${(error as Error).message}`);
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

async function chatWithPersona({
  messages,
  analystInterviewId,
  prompt,
  abortSignal,
  statReport,
  interviewLog,
}: Pick<
  ChatProps,
  "messages" | "analystInterviewId" | "prompt" | "abortSignal" | "statReport" | "interviewLog"
>) {
  const REDUCE_TOKENS: {
    model: LLMModelName;
    ratio: number;
  } = {
    model: "gemini-2.5-flash",
    ratio: 10,
  };
  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const reduceTokens = REDUCE_TOKENS as typeof REDUCE_TOKENS | null;
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model) : llm("gpt-4o"),
      providerOptions: providerOptions,
      system: prompt.personaPrompt,
      temperature: 0.3,
      messages: messages,
      tools: {
        [ToolName.tiktokSearch]: tiktokSearchTool,
        [ToolName.dySearch]: dySearchTool,
        [ToolName.insSearch]: insSearchTool,
        [ToolName.xhsSearch]: xhsSearchTool,
      },
      maxSteps: 2,
      onStepFinish: async (step) => {
        interviewLog.info({
          msg: "chatWithPersona streamText onStepFinish",
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
        interviewLog.info({ msg: "chatWithPersona streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        interviewLog.error(`chatWithPersona streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
    // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
    response.consumeStream().catch((error) => reject(error));
  }).catch((error) => {
    throw error;
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
      `Error saving messages with token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}

export async function runInterview({
  analystInterviewId,
  interviewUserChatId,
  prompt,
  abortSignal,
  statReport,
  interviewLog,
}: Omit<ChatProps, "messages" | "backgroundToken">) {
  const backgroundToken = new Date().valueOf().toString();
  await prisma.userChat.update({
    where: { id: interviewUserChatId, kind: "interview" },
    data: { backgroundToken },
  });

  const personaAgent = {
    messages: [
      { id: generateId(), role: "user", content: prompt.interviewerProloguePrompt },
    ] as Message[],
  };
  const interviewer = { messages: [] as Message[] };
  const saveParams = { analystInterviewId, interviewUserChatId, backgroundToken, interviewLog };
  const chatParams = { analystInterviewId, prompt, abortSignal, statReport, interviewLog };

  while (true) {
    const personaReply = await chatWithPersona({
      messages: personaAgent.messages,
      ...chatParams,
    });
    // interviewLog.info(`Persona:\n${message.content}\n`);
    await saveMessage({ message: { ...personaReply, role: "assistant" }, ...saveParams });
    personaAgent.messages.push({ ...personaReply, role: "assistant" });
    interviewer.messages.push({ ...personaReply, role: "user" });

    const interviewerReply = await chatWithInterviewer({
      messages: interviewer.messages,
      ...chatParams,
    });
    // interviewLog.info(`Interviewer:\n${message.content}\n`);
    await saveMessage({ message: { ...interviewerReply, role: "user" }, ...saveParams });
    interviewer.messages.push({ ...interviewerReply, role: "assistant" });
    personaAgent.messages.push({ ...interviewerReply, role: "user" });

    // TODO 这里可能有个问题：
    // 有时候 personaReply 或 interviewerReply 的 content 是空的，这时候一般是调用了一次工具但还没有文本回复
    // 由于 interviewer 的 assistant 消息会转换成 user 消息给 persona，反过来也是一样，user role message 转换成 coreMessage 的时候，tool 的内容会被忽略，这样就产生了一条空消息，没意义
    // 还没太好的解决方案，有一种方案就是让 interviewer 或者 persona 继续生成，直到输出文本，然后再让另一方继续

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
      `Error clearing interview token ${backgroundToken}: ${(error as Error).message}`,
    );
  }
}
