import { openai } from "@/lib/llm";
import {
  appendChunkToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  fixChatMessages,
  persistentAIMessageToDB,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { scoutSystemVerbose } from "@/prompt";
import { PlainTextToolResult } from "@/tools/utils";
import { convertToCoreMessages, generateId, Message, streamText, TextStreamPart, tool } from "ai";
import { z } from "zod";
import { dyPostCommentsTool, dySearchTool, dyUserPostsTool, StatReporter, ToolName } from "..";
import { savePersonaTool } from "../system/savePersona";
import { xhsNoteCommentsTool } from "../xhs/noteComments";
import { xhsSearchTool } from "../xhs/search";
import { xhsUserNotesTool } from "../xhs/userNotes";
import { reasoningThinkingTool } from "./reasoning";

const debouncePersistentMessage = (() => {
  let timeout: NodeJS.Timeout | null = null;
  return async (
    scoutUserChatId: number,
    message: Message,
    { immediate }: { immediate?: boolean } = {},
  ) => {
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(
      async () => {
        try {
          await persistentAIMessageToDB(scoutUserChatId, message);
          console.log(
            `ScoutUserChat [${scoutUserChatId}] Message ${message.id} persisted successfully`,
          );
        } catch (error) {
          console.log(
            `ScoutUserChat [${scoutUserChatId}] Error persisting message ${message.id}:`,
            error,
          );
        }
      },
      immediate ? 0 : 5000,
    ); // 5 second debounce
  };
})();

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
        .describe(
          "用户画像搜索任务 (scoutTask) 的 token，用于创建任务，你不需要提供，系统会自动生成",
        )
        // .default(() => generateToken())
        // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
        .transform(() => generateToken()),
      description: z.string().describe('用户画像搜索需求描述，用"帮我寻找"开头'),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ scoutUserChatToken, description }) => {
      // if (await prisma.userChat.findUnique({ where: { token: scoutUserChatToken } })) {
      //   return {
      //     personas: [],
      //     plainText: `你提供的 scoutUserChatToken ${scoutUserChatToken} 已经存在，无法使用，请重试。你可以忽略提供这个字段，系统会自动生成 token。`,
      //   };
      // }
      const title = description.substring(0, 50);
      const scoutUserChat = await prisma.userChat.create({
        data: {
          userId,
          title,
          kind: "scout",
          token: scoutUserChatToken,
        },
      });
      const scoutUserChatId = scoutUserChat.id;
      // 插入一条新的消息
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content: description,
      });
      let hasError = false;
      try {
        await runScoutTaskChatStream({
          scoutUserChatId,
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

async function runScoutTaskChatStream({
  scoutUserChatId,
  abortSignal,
  statReport,
}: {
  scoutUserChatId: number;
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
      `ScoutTaskChat [${scoutUserChatId}] Error resetting scoutyUserChat with token ${backgroundToken}`,
      error,
    );
    throw error;
  }

  const clearBackgroundToken = async () => {
    try {
      // mark as background running end
      await prisma.userChat.update({
        where: { id: scoutUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] Error clearing background token ${backgroundToken}`,
        error,
      );
    }
  };

  const tools = {
    [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
    [ToolName.xhsSearch]: xhsSearchTool,
    [ToolName.xhsUserNotes]: xhsUserNotesTool,
    [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
    [ToolName.dySearch]: dySearchTool,
    [ToolName.dyPostComments]: dyPostCommentsTool,
    [ToolName.dyUserPosts]: dyUserPostsTool,
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
  };

  while (true) {
    const messagesInDB = await prisma.chatMessage.findMany({
      where: { userChatId: scoutUserChatId },
      orderBy: { id: "asc" },
    });
    const aiMessages = fixChatMessages(messagesInDB.map(convertDBMessageToAIMessage), {
      removePendingTool: true,
    }); // 传给 LLM 的时候需要修复
    const coreMessages = convertToCoreMessages(aiMessages);
    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const streamingMessage: Omit<Message, "parts"> & { parts: NonNullable<Message["parts"]> } = {
        id: generateId(),
        role: "assistant",
        content: "",
        parts: [],
      };
      const response = streamText({
        model: openai("claude-3-7-sonnet-beta"),
        // model: openai("gpt-4o", {
        //   parallelToolCalls: true,
        // }),
        providerOptions: {
          openai: { stream_options: { include_usage: true } },
        },
        system: scoutSystemVerbose({
          doNotStopUntilScouted: false, // 不需要，下面自己会处理 continue
        }),
        messages: coreMessages,
        tools,
        maxSteps: 15,
        // onChunk: (chunk) => console.log(`[${scoutUserChatId}] ScoutTaskChat:`, JSON.stringify(chunk).substring(0, 100)),
        onFinish: async ({ steps }) => {
          const message = convertStepsToAIMessage(steps);
          resolve(message);
          await statReport("steps", steps.length, {
            reportedBy: "scoutTaskChat tool",
            scoutUserChatId,
          });
        },
        onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof tools> }) => {
          // console.log(`[${scoutUserChatId}] StudyChat onChunk:`, chunk);
          appendChunkToStreamingMessage(streamingMessage, chunk);
          await debouncePersistentMessage(scoutUserChatId, streamingMessage, {
            immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
          });
        },
        onStepFinish: async (step) => {
          console.log(
            `ScoutTaskChat [${scoutUserChatId}] step [${step.stepType}]`,
            step.toolCalls.map((call) => call.toolName),
          );
          if (step.usage.totalTokens > 0) {
            await statReport("tokens", step.usage.totalTokens, {
              reportedBy: "scoutTaskChat tool",
              scoutUserChatId,
            });
          }
          // appendStepToStreamingMessage(streamingMessage, step);
          // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
          //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
          // }
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
      // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
      await persistentAIMessageToDB(scoutUserChatId, {
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
  //
  // 完全结束以后，清理 backgroundToken
  await clearBackgroundToken();
}
