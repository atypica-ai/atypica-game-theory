import openai from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  appendStreamStepToUIMessage,
  fixChatMessages,
  generateToken,
  streamStepsToUIMessage,
} from "@/lib/utils";
import { scoutSystem } from "@/prompt";
import { PlainTextToolResult } from "@/tools/utils";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { generateId, Message, streamText, tool } from "ai";
import { z } from "zod";
import { StatReporter, ToolName } from "..";
import { savePersonaTool } from "../system/savePersona";
import { xhsNoteCommentsTool } from "../xhs/noteComments";
import { xhsSearchTool } from "../xhs/search";
import { xhsUserNotesTool } from "../xhs/userNotes";
import { reasoningThinkingTool } from "./reasoning";

export interface ScoutTaskCreateResult extends PlainTextToolResult {
  scoutUserChatId: number;
  scoutUserChatToken: string;
  title: string;
  plainText: string;
}

export interface ScoutTaskChatResult extends PlainTextToolResult {
  personas: {
    id: number;
    name: string;
    tags: string[];
  }[];
  plainText: string;
}

export const scoutTaskCreateTool = (userId: number) =>
  tool({
    description: "创建一个用户画像搜索任务",
    parameters: z.object({
      description: z.string().describe('用户画像搜索需求描述，用"帮我寻找"开头'),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ description }): Promise<ScoutTaskCreateResult> => {
      const title = description.substring(0, 50);
      const scoutUserChat = await prisma.userChat.create({
        data: {
          userId,
          title,
          kind: "scout",
          token: generateToken(),
          messages: [],
        },
      });
      return {
        scoutUserChatId: scoutUserChat.id,
        scoutUserChatToken: scoutUserChat.token,
        title: scoutUserChat.title,
        plainText: JSON.stringify({
          scoutUserChatId: scoutUserChat.id,
          title: scoutUserChat.title,
        }),
      };
    },
  });

export const scoutTaskChatTool = ({
  userId,
  abortSignal,
  statReport,
}: {
  userId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) =>
  tool({
    description: "开始执行用户画像搜索任务",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .optional()
        .describe("用户画像搜索任务 (scoutTask) 的 token，用于创建任务，不需要提供，会自动生成")
        .default(() => generateToken()),
      description: z.string().describe('用户画像搜索需求描述，用"帮我寻找"开头'),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ scoutUserChatToken, description }) => {
      const title = description.substring(0, 50);
      const scoutUserChat = await prisma.userChat.create({
        data: {
          userId,
          title,
          kind: "scout",
          token: scoutUserChatToken,
          messages: [],
        },
      });
      const scoutUserChatId = scoutUserChat.id;
      const messages = await prepareMessagesForLLM(scoutUserChatId);
      if (messages.length) {
        messages.push({ id: generateId(), role: "user", content: "继续" });
      } else {
        messages.push({ id: generateId(), role: "user", content: description });
      }
      let hasError = false;
      try {
        await runScoutTaskChatStream({
          scoutUserChatId,
          messages,
          abortSignal,
          statReport,
        });
      } catch (error) {
        console.log(
          `ScoutTaskChat [${scoutUserChatId}] runScoutTaskChatStream failed:`,
          (error as Error).message,
        );
        hasError = true;
      }
      const personasResult = await prisma.persona.findMany({
        where: { scoutUserChatId },
        orderBy: { createdAt: "desc" },
      });
      const personas = personasResult.map((persona) => ({
        id: persona.id,
        name: persona.name,
        tags: persona.tags as string[],
      }));
      return {
        personas: personas,
        plainText:
          !personas.length && hasError
            ? "Something went wrong"
            : (hasError ? "Something went wrong but " : "") +
              `${personas.length} personas found: ${JSON.stringify(personas)}`,
      };
    },
  });

/**
 * 从数据库读取历史消息并删除最后一条 user message
 */
async function prepareMessagesForLLM(scoutUserChatId: number) {
  const scoutUserChat = await prisma.userChat.findUniqueOrThrow({
    where: { id: scoutUserChatId, kind: "scout" },
  });
  let messages = scoutUserChat.messages as unknown as Message[];
  if (messages.length > 1 && messages[messages.length - 1].role === "user") {
    messages = messages.slice(0, -1);
  }
  return messages;
}

async function runScoutTaskChatStream({
  scoutUserChatId,
  messages: _messages,
  abortSignal,
  statReport,
}: {
  scoutUserChatId: number;
  messages: Message[];
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<void> {
  const backgroundToken = new Date().valueOf().toString();
  try {
    await prisma.userChat.update({
      where: { id: scoutUserChatId, kind: "scout" },
      data: { backgroundToken },
    });
  } catch (error) {
    console.log(
      `ScoutTaskChat [${scoutUserChatId}] Error resetting studyUserChat with token ${backgroundToken}`,
      error,
    );
    throw error;
  }

  const clearBackgroundToken = async () => {
    try {
      // mark as background running end
      await prisma.userChat.updateMany({
        where: { id: scoutUserChatId, kind: "scout" },
        data: { backgroundToken: null },
      });
    } catch (error) {
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] Error clearing background token ${backgroundToken}`,
        error,
      );
    }
  };

  let messages = [..._messages];
  while (true) {
    const updateLastMessage = ((scoutUserChatId: number, initialMessages: Message[]) => {
      // 这里要保持之前的消息不变，不断更新最后一条消息的 parts，所以要在闭包里暂存 initialMessages
      return async (streamingMessage: Omit<Message, "role">) => {
        const messages: Message[] = [
          ...initialMessages,
          { role: "assistant", ...streamingMessage },
        ];
        try {
          await prisma.userChat.update({
            where: { id: scoutUserChatId, backgroundToken },
            data: { messages: messages as unknown as InputJsonValue },
          });
        } catch (error) {
          console.log(
            `ScoutTaskChat [${scoutUserChatId}] Error updateLastMessage with token ${backgroundToken}:`,
            (error as Error).message,
          );
          throw error;
        }
      };
    })(scoutUserChatId, messages);

    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const streamingMessage: Omit<Message, "role"> = {
        id: generateId(),
        content: "",
        parts: [],
      };
      const response = streamText({
        model: openai("claude-3-7-sonnet"),
        providerOptions: {
          openai: { stream_options: { include_usage: true } },
        },
        system: scoutSystem({
          doNotStopUntilScouted: false, // 不需要，下面自己会处理 continue
        }),
        messages: fixChatMessages(messages, { removePendingTool: true }), // 传给 LLM 的时候需要修复
        tools: {
          [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
          [ToolName.xhsSearch]: xhsSearchTool,
          [ToolName.xhsUserNotes]: xhsUserNotesTool,
          [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
          [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
        },
        maxSteps: 15,
        // onChunk: (chunk) => console.log(`[${scoutUserChatId}] ScoutTaskChat:`, JSON.stringify(chunk).substring(0, 100)),
        onFinish: async ({ steps }) => {
          const message = streamStepsToUIMessage(steps);
          resolve(message);
          await statReport("steps", steps.length, {
            reportedBy: "scoutTaskChat tool",
            scoutUserChatId,
          });
        },
        onStepFinish: async (step) => {
          appendStreamStepToUIMessage(streamingMessage, step);
          if (step.usage.totalTokens > 0) {
            await statReport("tokens", step.usage.totalTokens, {
              reportedBy: "scoutTaskChat tool",
              scoutUserChatId,
            });
          }
          if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
            await updateLastMessage(streamingMessage);
          }
        },
        onError: ({ error }) => {
          console.log(
            `ScoutTaskChat [${scoutUserChatId}] runScoutTaskChatStream streamText onError:`,
            error,
          );
          reject(error);
        },
        abortSignal,
      });
      // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
      // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
      response.consumeStream().catch((error) => reject(error));
    });

    try {
      const message = await streamTextPromise;
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] message stream complete:`,
        message.content.substring(0, 20),
      );
    } catch (error) {
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] message stream error:`,
        (error as Error).message,
      );
      await clearBackgroundToken();
      throw error;
    }

    const personasResult = await prisma.persona.findMany({
      where: { scoutUserChatId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (personasResult.length < 5) {
      // 开始一轮新的搜索
      messages = await prepareMessagesForLLM(scoutUserChatId);
      messages.push({
        id: generateId(),
        role: "user",
        content: `目前总结了${personasResult.length}个personas，还不够5个，请继续`,
      });
      continue;
    } else {
      break;
    }
  }
  // while loop end
}
