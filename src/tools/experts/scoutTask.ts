import { llm, LLMModelName, providerOptions } from "@/lib/llm";
import {
  appendChunkToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  createDebouncePersistentMessage,
  fixChatMessages,
  persistentAIMessageToDB,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { scoutSystem } from "@/prompt";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  handleToolCallError,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  reasoningThinkingTool,
  savePersonaTool,
  StatReporter,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  toolCallError,
  ToolName,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/tools";
import { PlainTextToolResult } from "@/tools/utils";
import {
  convertToCoreMessages,
  generateId,
  Message,
  streamText,
  TextStreamPart,
  tool,
  ToolChoice,
} from "ai";
import { Logger } from "pino";
import { z } from "zod";

const MAX_STEPS_EACH_ROUND = 15; // streamText 默认 15 步
const LIMIT_SOCIAL_TOOLS_USE = 20; // 最多使用 20 次 social 搜索
const PERSONAS_REQUIRED = 5; // 至少需要 5 个画像
const REDUCE_TOKENS: {
  model: LLMModelName;
  ratio: number;
} = {
  model: "gemini-2.5-flash",
  ratio: 8,
};

export interface ScoutTaskChatResult extends PlainTextToolResult {
  personas: {
    id: number;
    name: string;
    tags: string[];
  }[];
  plainText: string;
}

export const scoutTaskChatTool = ({
  userId,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description: "开始执行用户画像搜索任务",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .optional()
        .describe(
          "用户画像搜索任务 (scoutTask) 的 token，用于创建任务，如果上一个 scoutTaskChat 任务未完成，请提供上一个 scoutUserChatToken，否则忽略这个参数，系统会自动生成",
        )
        .default(() => generateToken()),
      // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
      // .transform(() => generateToken()),
      description: z.string().describe('用户画像搜索需求描述，可以用"帮我寻找"或类似英文短语开头'),
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
      const scoutUserChat = await prisma.userChat.upsert({
        where: {
          userId,
          kind: "scout",
          token: scoutUserChatToken,
        },
        create: {
          userId,
          title,
          kind: "scout",
          token: scoutUserChatToken,
        },
        update: {},
      });
      const scoutUserChatId = scoutUserChat.id;
      const scoutLog = studyLog.child({ scoutUserChatId, scoutUserChatToken });
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
          scoutLog,
        });
      } catch (error) {
        scoutLog.error(`runScoutTaskChatStream failed: ${(error as Error).message}`);
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
        // 如果有 personas，就算 hasError 也忽略，不要告诉 llm，不然容易给 llm 造成困扰以为找到的 personas 有问题
        plainText: personas.length
          ? `${personas.length} personas found: ${JSON.stringify(personas)}`
          : hasError
            ? "Something went wrong"
            : "No personas found",
      };
    },
  });

async function runScoutTaskChatStream({
  scoutUserChatId,
  abortSignal,
  statReport,
  scoutLog,
}: {
  scoutUserChatId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  scoutLog: Logger;
}): Promise<void> {
  const backgroundToken = new Date().valueOf().toString();
  try {
    await prisma.userChat.update({
      where: { id: scoutUserChatId, kind: "scout" },
      data: { backgroundToken },
    });
  } catch (error) {
    scoutLog.error(
      `Error setting background token ${backgroundToken}: ${(error as Error).message}`,
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
      scoutLog.error(
        `Error clearing background token ${backgroundToken}: ${(error as Error).message}`,
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
    [ToolName.tiktokSearch]: tiktokSearchTool,
    [ToolName.tiktokPostComments]: tiktokPostCommentsTool,
    [ToolName.tiktokUserPosts]: tiktokUserPostsTool,
    [ToolName.insSearch]: insSearchTool,
    [ToolName.insUserPosts]: insUserPostsTool,
    [ToolName.insPostComments]: insPostCommentsTool,
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
    [ToolName.toolCallError]: toolCallError,
  };

  let reduceTokens: typeof REDUCE_TOKENS | null = REDUCE_TOKENS;
  let toolChoice: ToolChoice<typeof tools> = "auto";
  let maxSteps = MAX_STEPS_EACH_ROUND;
  while (true) {
    const messagesInDB = await prisma.chatMessage.findMany({
      where: { userChatId: scoutUserChatId },
      orderBy: { id: "asc" },
    });
    const aiMessages = fixChatMessages(messagesInDB.map(convertDBMessageToAIMessage)); // 传给 LLM 的时候需要修复
    const socialToolCallCounts = aiMessages.reduce((count, message) => {
      const socialToolCalls = (message.parts ?? []).filter(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.state === "result" &&
          /^(xhs|dy|tiktok|ins)/.test(part.toolInvocation.toolName),
      );
      return count + socialToolCalls.length;
    }, 0);
    if (socialToolCallCounts > LIMIT_SOCIAL_TOOLS_USE) {
      // 最多搜索 LIMIT_SOCIAL_TOOLS_USE 次，超出以后不再搜索，直接保存
      toolChoice = {
        type: "tool",
        toolName: ToolName.savePersona,
      };
      maxSteps = MAX_STEPS_EACH_ROUND; // maxSteps 只需要够 savePersona 用就行
    }
    const coreMessages = convertToCoreMessages(aiMessages);
    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const streamingMessage: Omit<Message, "parts"> & { parts: NonNullable<Message["parts"]> } = {
        id: generateId(),
        role: "assistant",
        content: "",
        parts: [],
      };
      const { debouncePersistentMessage, immediatePersistentMessage } =
        createDebouncePersistentMessage(scoutUserChatId, 5000, scoutLog); // 5000 debounce
      const response = streamText({
        model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),
        // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
        providerOptions: providerOptions,
        system: scoutSystem(),
        messages: coreMessages,
        tools,
        toolChoice: toolChoice,
        experimental_repairToolCall: handleToolCallError,
        maxSteps: maxSteps,
        onFinish: async ({ steps }) => {
          const message = convertStepsToAIMessage(steps);
          resolve(message);
          await statReport("steps", steps.length, {
            reportedBy: "scoutTaskChat tool",
            scoutUserChatId,
          });
        },
        onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof tools> }) => {
          appendChunkToStreamingMessage(streamingMessage, chunk);
          await debouncePersistentMessage(streamingMessage, {
            immediate: chunk.type !== "text-delta",
            // 只在 text-delta 类型的时候才 debounce，靠谱点。see https://github.com/bmrlab/atypica-llm-app/issues/40
            // immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
          });
        },
        onStepFinish: async (step) => {
          await immediatePersistentMessage();
          // 注意，stepFinish 一定要保存，并且强制 immediate:true
          // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
          // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
          // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整
          scoutLog.info({
            msg: "Step finished",
            stepType: step.stepType,
            toolCalls: step.toolCalls.map((call) => call.toolName),
            usage: step.usage,
          });
          if (step.usage.totalTokens > 0) {
            let tokens = step.usage.totalTokens;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra: any = {
              reportedBy: "scoutTaskChat tool",
              scoutUserChatId,
            };
            if (reduceTokens) {
              extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
              tokens = Math.ceil(tokens / reduceTokens.ratio);
            }
            await statReport("tokens", tokens, extra);
          }
          // appendStepToStreamingMessage(streamingMessage, step);
          // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
          //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
          // }
        },
        onError: ({ error }) => {
          scoutLog.error(`runScoutTaskChatStream streamText onError: ${(error as Error).message}`);
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
      scoutLog.info(`message stream complete: ${message.content.substring(0, 20)}`);
    } catch (error) {
      const errMsg = (error as Error).message;
      scoutLog.error(`message stream error: ${errMsg}`);
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        // 如果遇到了用量限制，不报错，换个模型
        scoutLog.error(`RESOURCE_EXHAUSTED, fallback to llm without reduceTokens`);
        reduceTokens = null;
      } else {
        await clearBackgroundToken();
        throw error;
      }
    }

    const personasCount = await prisma.persona.count({ where: { scoutUserChatId } });
    if (personasCount < PERSONAS_REQUIRED) {
      // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content: "continue",
        // getDeployRegion() === "mainland"
        //   ? `目前总结了${personasResult.length}个personas，还不够5个，请批量保存人设后再考虑是否继续`
        //   : `Currently we have identified ${personasResult.length} personas, which is not enough to reach 5. Please continue saving multiple personas and then consider whether to continue`,
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

// export interface ScoutTaskCreateResult extends PlainTextToolResult {
//   scoutUserChatId: number;
//   scoutUserChatToken: string;
//   title: string;
//   plainText: string;
// }

// export const scoutTaskCreateTool = (userId: number) =>
//   tool({
//     description: "创建一个用户画像搜索任务",
//     parameters: z.object({
//       description: z.string().describe('用户画像搜索需求描述，用"帮我寻找"开头'),
//     }),
//     experimental_toToolResultContent: (result: PlainTextToolResult) => {
//       return [{ type: "text", text: result.plainText }];
//     },
//     execute: async ({ description }): Promise<ScoutTaskCreateResult> => {
//       const title = description.substring(0, 50);
//       const scoutUserChat = await prisma.userChat.create({
//         data: {
//           userId,
//           title,
//           kind: "scout",
//           token: generateToken(),
//         },
//       });
//       return {
//         scoutUserChatId: scoutUserChat.id,
//         scoutUserChatToken: scoutUserChat.token,
//         title: scoutUserChat.title,
//         plainText: JSON.stringify({
//           scoutUserChatId: scoutUserChat.id,
//           title: scoutUserChat.title,
//         }),
//       };
//     },
//   });
