import { openai } from "@/lib/llm";
import { convertStepsToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { interviewerPrologue, interviewerSystem, personaAgentSystem } from "@/prompt";
import { saveInterviewConclusionTool, StatReporter, ToolName, xhsSearchTool } from "@/tools/";
import { PlainTextToolResult } from "@/tools/utils";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { generateId, Message, streamText, tool } from "ai";
import { z } from "zod";
import { reasoningThinkingTool } from "./reasoning";

export interface InterviewChatResult extends PlainTextToolResult {
  interviews: {
    analystId: number;
    personaId: number;
    personaName: string;
    conclusion?: string;
    result: string;
  }[];
  plainText: string;
}

export const interviewChatTool = ({
  userId,
  abortSignal,
  statReport,
}: {
  userId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) =>
  tool({
    description: "针对一个调研主题的一系列用户进行访谈，每次最多5人",
    parameters: z.object({
      analystId: z.number().describe("调研主题的ID"),
      personas: z
        .array(
          z.object({
            id: z.number().describe("调研对象的ID"),
            name: z.string().describe("调研对象的姓名"),
          }),
        )
        .describe("调研对象的列表，最多5人"),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ analystId, personas }): Promise<InterviewChatResult> => {
      const single = async ({ id: personaId, name: personaName }: { id: number; name: string }) => {
        try {
          const { analystInterviewId, interviewUserChatId, prompt } = await prepareDBForInterview({
            userId,
            personaId,
            analystId,
          });
          await runInterview({
            analystInterviewId,
            interviewUserChatId,
            prompt,
            abortSignal,
            statReport,
          });
          const updatedInterview = await prisma.analystInterview.findUniqueOrThrow({
            where: { id: analystInterviewId },
          });
          return {
            analystId,
            personaId,
            personaName,
            conclusion: updatedInterview.conclusion,
            result: "访谈结束",
          };
        } catch (error) {
          return {
            analystId,
            personaId,
            personaName,
            result: `访谈遇到问题 ${(error as Error).message}`,
          };
        }
      };
      const interviewResults = await Promise.all(personas.map(single));
      await new Promise((resolve) => {
        // 等 5s, 确保前端可以把 conclusion 显示出来
        setTimeout(() => resolve(null), 5000);
      });
      return {
        interviews: interviewResults,
        plainText: JSON.stringify(interviewResults),
      };
    },
  });

export async function prepareDBForInterview({
  userId,
  personaId,
  analystId,
}: {
  userId: number;
  personaId: number;
  analystId: number;
}) {
  const [persona, analyst] = await Promise.all([
    prisma.persona.findUniqueOrThrow({ where: { id: personaId } }),
    prisma.analyst.findUniqueOrThrow({ where: { id: analystId } }),
  ]);
  const personaPrompt = personaAgentSystem(persona);
  const interviewerPrompt = interviewerSystem(analyst);
  const interviewerProloguePrompt = interviewerPrologue(analyst);
  const conclusion = ""; // conclusion 被用于判断是否结束，开始前一定要清空
  // 确认 analyst 属于用户
  await prisma.userAnalyst.findUniqueOrThrow({
    where: { userId_analystId: { userId, analystId } },
  });
  const interview = await prisma.analystInterview.upsert({
    where: {
      analystId_personaId: { analystId, personaId },
    },
    update: { personaPrompt, interviewerPrompt, conclusion },
    create: { analystId, personaId, personaPrompt, interviewerPrompt, conclusion },
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
};

async function chatWithInterviewer({
  messages,
  analystInterviewId,
  prompt,
  abortSignal,
  statReport,
}: Pick<ChatProps, "messages" | "analystInterviewId" | "prompt" | "abortSignal" | "statReport">) {
  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const response = streamText({
      model: openai("claude-3-7-sonnet"), // 不能用 gpt-4o，指令遵循的比较差，会结束不了
      providerOptions: {
        openai: { stream_options: { include_usage: true } },
      },
      system: prompt.interviewerPrompt,
      messages,
      tools: {
        [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
        [ToolName.saveInterviewConclusion]: saveInterviewConclusionTool(analystInterviewId),
      },
      maxSteps: 3,
      // onChunk: (chunk) => console.log(`Interview [${analystInterviewId}] Interviewer:`, JSON.stringify(chunk)),
      onStepFinish: async (step) => {
        if (step.usage.totalTokens > 0) {
          await statReport("tokens", step.usage.totalTokens, {
            reportedBy: "interview tool",
            analystInterviewId,
            role: "interviewer",
          });
        }
      },
      onFinish: async ({ steps }) => {
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        console.log(
          `Interview [${analystInterviewId}] chatWithInterviewer streamText onError:`,
          error,
        );
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
}: Pick<ChatProps, "messages" | "analystInterviewId" | "prompt" | "abortSignal" | "statReport">) {
  const result = await new Promise<Omit<Message, "role">>(async (resolve, reject) => {
    const response = streamText({
      model: openai("gpt-4o"),
      providerOptions: {
        openai: { stream_options: { include_usage: true } },
      },
      system: prompt.personaPrompt,
      messages,
      tools: {
        [ToolName.xhsSearch]: xhsSearchTool,
      },
      maxSteps: 3,
      // onChunk: (chunk) => console.log(`Interview [${analystInterviewId}] Persona:`, JSON.stringify(chunk)),
      onStepFinish: async (step) => {
        if (step.usage.totalTokens > 0) {
          await statReport("tokens", step.usage.totalTokens, {
            reportedBy: "interview tool",
            analystInterviewId,
            role: "persona",
          });
        }
      },
      onFinish: ({ steps }) => {
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        console.log(`Interview [${analystInterviewId}] chatWithPersona streamText onError:`, error);
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
  analystInterviewId,
  interviewUserChatId,
  backgroundToken,
}: {
  message: Message;
  analystInterviewId: number;
  interviewUserChatId: number;
  backgroundToken: string;
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
    console.log(
      `Interview [${analystInterviewId}] Error saving messages with token ${backgroundToken}`,
      error,
    );
  }
}

export async function runInterview({
  analystInterviewId,
  interviewUserChatId,
  prompt,
  abortSignal,
  statReport,
}: Omit<ChatProps, "messages" | "backgroundToken">) {
  const backgroundToken = new Date().valueOf().toString();
  await prisma.userChat.update({
    where: { id: interviewUserChatId, kind: "interview" },
    data: { backgroundToken },
  });

  const personaAgent: {
    messages: Message[];
  } = {
    messages: [{ id: generateId(), role: "user", content: prompt.interviewerProloguePrompt }],
  };

  const interviewer: {
    messages: Message[];
  } = {
    messages: [],
  };

  while (true) {
    const personaReply = await chatWithPersona({
      messages: personaAgent.messages,
      analystInterviewId,
      prompt,
      abortSignal,
      statReport,
    });
    // console.log(`Interview [${analystInterviewId}] Persona:\n${message.content}\n`);
    personaAgent.messages.push({ ...personaReply, role: "assistant" });
    interviewer.messages.push({ ...personaReply, role: "user" });

    await saveMessage({
      message: { ...personaReply, role: "assistant" },
      analystInterviewId,
      interviewUserChatId,
      backgroundToken,
    });

    const interviewerReply = await chatWithInterviewer({
      messages: interviewer.messages,
      analystInterviewId,
      prompt,
      abortSignal,
      statReport,
    });
    // console.log(`Interview [${analystInterviewId}] Interviewer:\n${message.content}\n`);
    interviewer.messages.push({ ...interviewerReply, role: "assistant" });
    personaAgent.messages.push({ ...interviewerReply, role: "user" });

    await saveMessage({
      message: { ...interviewerReply, role: "user" },
      analystInterviewId,
      interviewUserChatId,
      backgroundToken,
    });

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
    console.log(
      `Interview [${analystInterviewId}] Error clearing interview token ${backgroundToken} for interviewUserChat ${interviewUserChatId}`,
      error,
    );
  }
}
