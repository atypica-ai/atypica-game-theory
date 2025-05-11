import { llm, LLMModelName, providerOptions } from "@/ai/llm";
import {
  appendChunkToStreamingMessage,
  CONTINUE_ASSISTANT_STEPS,
  convertStepsToAIMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { buildPersonaSystem, scoutSystem } from "@/ai/prompt";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  handleToolCallError,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  PlainTextToolResult,
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
} from "@/ai/tools";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import {
  DataStreamWriter,
  generateId,
  Message,
  smoothStream,
  streamText,
  TextStreamPart,
  tool,
  ToolChoice,
} from "ai";
import { Logger } from "pino";
import { z } from "zod";

const TOKENS_COMSUME_LIMIT = 300_000; // 限制 30w token 消耗量，根据统计，差不多
const SCOUT_STEPS = 15; // 进行 15 步搜索，结束以后保存画像
const REDUCE_TOKENS: {
  model: LLMModelName;
  ratio: number;
} = {
  model: "gemini-2.5-flash",
  ratio: 8,
};

type TPlatform = "小红书" | "抖音" | "TikTok" | "Instagram";
const toolPlatform = (toolName: ToolName): TPlatform | undefined => {
  const platforms: Partial<Record<ToolName, TPlatform>> = {
    [ToolName.xhsNoteComments]: "小红书",
    [ToolName.xhsSearch]: "小红书",
    [ToolName.xhsUserNotes]: "小红书",
    [ToolName.dySearch]: "抖音",
    [ToolName.dyPostComments]: "抖音",
    [ToolName.dyUserPosts]: "抖音",
    [ToolName.tiktokSearch]: "TikTok",
    [ToolName.tiktokPostComments]: "TikTok",
    [ToolName.tiktokUserPosts]: "TikTok",
    [ToolName.insSearch]: "Instagram",
    [ToolName.insUserPosts]: "Instagram",
    [ToolName.insPostComments]: "Instagram",
  };
  return platforms[toolName];
};

export interface ScoutTaskChatResult extends PlainTextToolResult {
  personas?: {
    id: number;
    name: string;
    tags: string[];
  }[]; // 历史消息的任务里是有 personas 的，新的没了，不过这个需要长期保留，不做迁移
  stats?: {
    [platform in TPlatform]: number;
  };
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
    description: "开始执行用户画像搜索任务（scoutTask）",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .optional()
        .describe(
          "用户画像搜索任务 (scoutTask) 的唯一标识，用于创建任务，忽略这个参数，系统会自动生成",
        )
        .transform(() => generateToken()),
      // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
      // "用户画像搜索任务 (scoutTask) 的 token，用于创建任务，如果上一个 scoutTaskChat 任务未完成，请提供上一个 scoutUserChatToken，否则忽略这个参数，系统会自动生成",
      // .default(() => generateToken()),
      description: z.string().describe('用户画像搜索需求描述，可以用"帮我寻找"或类似英文短语开头'),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ scoutUserChatToken, description }) => {
      const title = description.substring(0, 50);
      // 现在不需要复用一个 scoutTask 了，因为可以随时对一个 scoutTask 构建人设 buildPersona，所以每次都创建新的
      const scoutUserChat = await prisma.userChat.create({
        data: { userId, title, kind: "scout", token: scoutUserChatToken },
      });
      const scoutUserChatId = scoutUserChat.id;
      const scoutLog = studyLog.child({ scoutUserChatId, scoutUserChatToken });
      // 插入一条新的消息
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content: description,
      });
      // let hasError = false;
      try {
        await runScoutTaskChatStream({
          scoutUserChatId,
          abortSignal,
          statReport,
          scoutLog,
        });
      } catch (error) {
        scoutLog.error(`runScoutTaskChatStream failed: ${(error as Error).message}`);
        throw error;
        // hasError = true;
        // 出错的保持没有 result 的状态，抛出错误让 study 停止，
        // - study 不会因为错误而过度消耗，进而需要人为介入
        // - toolUseCount 不统计没有 result 的 tool
      }
      const messages = await prisma.chatMessage.findMany({
        where: { userChatId: scoutUserChatId },
        orderBy: { id: "asc" },
      });
      const stats = messages.reduce(
        (_stats, message) => {
          const stats = { ..._stats };
          ((message.parts ?? []) as NonNullable<Message["parts"]>).forEach((part) => {
            if (part.type === "tool-invocation") {
              const toolName = part.toolInvocation.toolName as ToolName;
              const platform = toolPlatform(toolName);
              if (platform) {
                stats[platform] = (stats[platform] || 0) + 1;
              }
            }
          });
          return stats;
        },
        {} as NonNullable<ScoutTaskChatResult["stats"]>,
      );
      return {
        stats: stats,
        plainText: `Scout task completed successfully.\n\nStats:\n${JSON.stringify(stats)}`,
      };
    },
  });

export async function runScoutTaskChatStream({
  scoutUserChatId,
  abortSignal,
  statReport,
  scoutLog,
  streamWriter,
}: {
  scoutUserChatId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  scoutLog: Logger;
  streamWriter?: DataStreamWriter;
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

  const allTools = {
    // [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }), // 会干扰后面 buildPersona ，不要了
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }), // 实际不会被用到，但先放着，历史代码
    [ToolName.dySearch]: dySearchTool,
    [ToolName.dyPostComments]: dyPostCommentsTool,
    [ToolName.dyUserPosts]: dyUserPostsTool,
    [ToolName.tiktokSearch]: tiktokSearchTool,
    [ToolName.tiktokPostComments]: tiktokPostCommentsTool,
    [ToolName.tiktokUserPosts]: tiktokUserPostsTool,
    [ToolName.insSearch]: insSearchTool,
    [ToolName.insUserPosts]: insUserPostsTool,
    [ToolName.insPostComments]: insPostCommentsTool,
    [ToolName.xhsSearch]: xhsSearchTool,
    [ToolName.xhsUserNotes]: xhsUserNotesTool,
    [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
    [ToolName.toolCallError]: toolCallError,
  };

  let endRound = false;
  let tokensConsumed = 0;
  while (true) {
    const { coreMessages, streamingMessage, toolUseCount } =
      await prepareMessagesForStreaming(scoutUserChatId);
    let systemPrompt = scoutSystem();
    let reduceTokens: typeof REDUCE_TOKENS | null = REDUCE_TOKENS;
    let tools = Object.fromEntries(
      Object.entries(allTools).filter(([key]) => key !== ToolName.savePersona),
    ) as typeof allTools;
    let toolChoice: ToolChoice<typeof allTools> = "auto";
    let maxSteps = SCOUT_STEPS;
    if (coreMessages.length > 2 && Object.keys(toolUseCount).length === 0) {
      // 两条消息以后，必须开始使用工具，但是为了不一直使用工具，调用2次先停下来，后面好重新判断 toolUseCount
      toolChoice = "required";
      maxSteps = 2;
    }
    if (coreMessages.length > SCOUT_STEPS * 2) {
      // 进入终局，批量保存人设
      endRound = true;
      systemPrompt = buildPersonaSystem();
      reduceTokens = null; // 使用 claude
      tools = Object.fromEntries(
        Object.entries(allTools).filter(
          ([key]) => key === ToolName.savePersona || key === ToolName.toolCallError,
        ),
      ) as typeof allTools;
      toolChoice = {
        type: "tool",
        toolName: ToolName.savePersona,
      };
      maxSteps = 1;
      // 超出限制以后不再继续，直接结束，上面的这些赋值先留着，保留历史代码
      break;
    }
    const { debouncePersistentMessage, immediatePersistentMessage } =
      createDebouncePersistentMessage(scoutUserChatId, 5000, scoutLog); // 5000 debounce
    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const response = streamText({
        model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),
        // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
        providerOptions: providerOptions,
        system: systemPrompt,
        temperature: 0.5,
        messages: coreMessages,
        tools: tools,
        toolChoice: toolChoice,
        experimental_repairToolCall: handleToolCallError,
        maxSteps: maxSteps,
        experimental_generateMessageId: () => streamingMessage.id,
        experimental_transform: smoothStream({
          delayInMs: 30,
          chunking: /[\u4E00-\u9FFF]|\S+\s+/,
        }),
        onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof allTools> }) => {
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
          const toolCalls = step.toolCalls.map((call) => call.toolName);
          const usage = step.usage;
          scoutLog.info({
            msg: "runScoutTaskChatStream streamText onStepFinish",
            stepType: step.stepType,
            toolCalls,
            usage,
          });
          if (statReport) {
            const reportedBy = "scoutTaskChat tool";
            const promises = [
              statReport("steps", toolCalls.length, { reportedBy, scoutUserChatId, toolCalls }),
            ];
            if (usage.totalTokens > 0) {
              let tokens = usage.totalTokens;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const extra: any = { reportedBy, scoutUserChatId, usage };
              if (reduceTokens) {
                extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
                tokens = Math.ceil(tokens / reduceTokens.ratio);
              }
              tokensConsumed += tokens;
              promises.push(statReport("tokens", tokens, extra));
            }
            await Promise.all(promises);
          }
          // appendStepToStreamingMessage(streamingMessage, step);
          // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
          //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
          // }
        },
        onFinish: async ({ steps, usage }) => {
          scoutLog.info({ msg: "runScoutTaskChatStream streamText onFinish", usage });
          const message = convertStepsToAIMessage(steps);
          resolve(message);
        },
        onError: ({ error }) => {
          scoutLog.error(`runScoutTaskChatStream streamText onError: ${(error as Error).message}`);
          reject(error);
        },
        abortSignal,
      });
      if (streamWriter) {
        response.mergeIntoDataStream(streamWriter);
      }
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

    if (endRound) {
      scoutLog.info("ScoutTask completed");
      break;
    }
    if (tokensConsumed > TOKENS_COMSUME_LIMIT) {
      // 达到了离谱的 token 消耗，无条件退出
      scoutLog.error(`tokensConsumed ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}`);
      break;
    }
    // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
    await persistentAIMessageToDB(scoutUserChatId, {
      id: generateId(),
      role: "user",
      content: CONTINUE_ASSISTANT_STEPS,
    });
  }
  // while loop end
  // 完全结束以后，清理 backgroundToken
  await clearBackgroundToken();
}

// const LIMIT_SOCIAL_TOOLS_USE = 20; // 最多使用 20 次 social 搜索
// const socialToolCallCounts = (Object.keys(allTools) as ToolName[]).reduce((count, toolName) => {
//   if (/^(xhs|dy|tiktok|ins)/.test(toolName)) {
//     return count + (toolUseCount[toolName] ?? 0);
//   } else {
//     return count;
//   }
// }, 0);

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
