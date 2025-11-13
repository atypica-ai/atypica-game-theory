import "server-only";

import {
  appendChunkToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { scoutSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/tools";
import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import {
  generateId,
  getToolName,
  isToolUIPart,
  smoothStream,
  stepCountIs,
  streamText,
  TextStreamPart,
  tool,
  ToolChoice,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { Logger } from "pino";
import {
  scoutChatTools,
  scoutTaskChatInputSchema,
  scoutTaskChatOutputSchema,
  type ScoutTaskChatResult,
  type TPlatform,
} from "./types";

export const createBackgroundToken = async ({
  scoutUserChatId,
  scoutLog,
}: {
  scoutUserChatId: number;
  scoutLog: Logger;
}) => {
  const backgroundToken = new Date().valueOf().toString();
  try {
    await prisma.userChat.update({
      where: { id: scoutUserChatId, OR: [{ kind: "scout" }, { kind: "misc" }] },
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
      scoutLog.warn(
        `Error clearing background token ${backgroundToken}: ${(error as Error).message}`,
      );
    }
  };

  return { clearBackgroundToken };
};

const TOKENS_COMSUME_LIMIT = 150_000; // 限制 15w token 消耗量
const SCOUT_TOOLS_LIMIT = 15; // 进行 15 次搜索，结束以后保存画像
const SCOUT_MESSAGES_LIMIT = 20; // 最多 10 轮对话，结束以后保存画像
type TReduceTokens = {
  model: LLMModelName;
  ratio: number;
} | null;

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
    [ToolName.twitterSearch]: "Twitter",
    [ToolName.twitterUserPosts]: "Twitter",
    [ToolName.twitterPostComments]: "Twitter",
  };
  return platforms[toolName];
};

export const scoutTaskChatTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Conduct comprehensive social media research to discover user behavioral patterns, decision-making processes, and cognitive frameworks across multiple platforms for building representative user personas",
    inputSchema: scoutTaskChatInputSchema,
    outputSchema: scoutTaskChatOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ scoutUserChatToken, description }) => {
      // 现在不需要复用一个 scoutTask 了，因为可以随时对一个 scoutTask 构建人设 buildPersona，所以每次都创建新的
      const scoutUserChat = await createUserChat({
        userId,
        title: truncateForTitle(description, {
          maxDisplayWidth: 100,
          suffix: "...",
        }),
        kind: "scout",
        token: scoutUserChatToken,
      });
      const scoutUserChatId = scoutUserChat.id;
      const scoutLog = logger.child({ scoutUserChatId, scoutUserChatToken });
      // 插入一条新的消息
      await persistentAIMessageToDB({
        userChatId: scoutUserChatId,
        message: {
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: description }],
        },
      });
      const { clearBackgroundToken } = await createBackgroundToken({ scoutUserChatId, scoutLog });
      try {
        await runScoutTaskChatStream({
          locale,
          scoutUserChatId,
          abortSignal,
          statReport,
          logger: scoutLog,
        });
      } catch (error) {
        throw error;
        // 出错的保持没有 result 的状态，抛出错误让 study 停止，
        // - study 不会因为错误而过度消耗，进而需要人为介入
        // - toolUseCount 不会统计没有 result 的 tool
      } finally {
        await clearBackgroundToken();
      }
      const messages = (
        await prisma.chatMessage.findMany({
          where: { userChatId: scoutUserChatId },
          orderBy: { id: "asc" },
        })
      ).map(convertDBMessageToAIMessage);
      const stats = messages.reduce(
        (_stats, message) => {
          const stats = { ..._stats };
          message.parts.forEach((part) => {
            if (isToolUIPart(part)) {
              const toolName = getToolName(part) as ToolName;
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
        personas: undefined,
        stats: stats,
        plainText: `Social media research completed successfully. Data collected from multiple platforms ready for persona building.\n\nPlatform Coverage:\n${JSON.stringify(stats)}`,
      };
    },
  });

export async function runScoutTaskChatStream({
  scoutUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
  streamWriter,
}: {
  scoutUserChatId: number;
  streamWriter?: UIMessageStreamWriter;
} & AgentToolConfigArgs): Promise<void> {
  const allTools = { ...scoutChatTools() };
  const systemPrompt = scoutSystem({ locale });
  const tools = allTools;
  // const tools =
  //   locale === "zh-CN"
  //     ? allTools
  //     : (Object.fromEntries(
  //         Object.entries(allTools).filter(([key]) => !/^(xhs|dy)/.test(key)),
  //       ) as typeof allTools);
  let tokensConsumed = 0;
  while (true) {
    const { coreMessages, streamingMessage, toolUseCount } = await prepareMessagesForStreaming(
      scoutUserChatId,
      { tools: allTools },
    );

    if (tokensConsumed > TOKENS_COMSUME_LIMIT) {
      // 达到了离谱的 token 消耗，无条件退出
      logger.error(
        `Token consumption ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}, ending scout`,
      );
      break;
    }
    const scoutToolsCount = Object.values(toolUseCount).reduce((acc, value) => acc + value, 0);
    if (scoutToolsCount >= SCOUT_TOOLS_LIMIT) {
      // 达到了工具使用次数限制，无条件退出
      logger.info(`Tool usage ${scoutToolsCount} exceeds limit ${SCOUT_TOOLS_LIMIT}, ending scout`);
      break;
    }
    if (coreMessages.length >= SCOUT_MESSAGES_LIMIT) {
      // 达到了消息数量限制，无条件退出，有时候模型会不调用工具反复输出文本消息，所以这个限制需要加上
      logger.info(
        `Message count ${coreMessages.length} exceeds limit ${SCOUT_MESSAGES_LIMIT}, ending scout`,
      );
      break;
    }

    // coreMessages 来判断不靠谱，多个 steps 连续的消息在 coreMessages 会作为一整个数组放进 message.content，和 parts 类似
    // if (coreMessages.length >= SCOUT_CALLS_LIMIT * 2) {
    //   // 超出限制以后不再继续，直接结束，这个判断后置，也就是说，超出了以后，再跑最后一轮
    //   break;
    // }

    let toolChoice: ToolChoice<typeof allTools> = "auto";
    let maxSteps = 2; // 不要一下子很多 steps 因为现在会并行调用 tools，每一轮 steps 少一点，方便及时判断 coreMessages 长度
    let reduceTokens: TReduceTokens = { model: "gemini-2.5-flash", ratio: 10 };

    if (coreMessages.length > 2 && Object.keys(toolUseCount).length === 0) {
      // 两条消息以后，必须开始使用工具，但是为了不一直使用工具，调用2次先停下来，后面好重新判断 toolUseCount
      toolChoice = "required";
      maxSteps = 1;
    }

    const { debouncePersistentMessage, immediatePersistentMessage } =
      createDebouncePersistentMessage(scoutUserChatId, 5000, logger); // 5000 debounce
    const streamTextPromise = new Promise<Omit<UIMessage, "role">>((resolve, reject) => {
      const response = streamText({
        model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),

        // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
        providerOptions: defaultProviderOptions,

        system: systemPrompt,
        temperature: 0.5,
        messages: coreMessages,
        tools:
          reduceTokens && reduceTokens.model.startsWith("gemini")
            ? {
                ...tools,
                // 暂时不使用
                // google_search: google.tools.googleSearch({
                //   mode: "MODE_DYNAMIC",
                //   dynamicThreshold: 0.3, // threshold 越小，使用搜索的可能性就越高
                // }),
              }
            : tools,
        toolChoice: toolChoice,

        // 这个要求 tools 里面有 [ToolName.toolCallError]
        experimental_repairToolCall: handleToolCallError,

        stopWhen: stepCountIs(maxSteps),

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
          const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
          logger.info({
            msg: "runScoutTaskChatStream streamText onStepFinish",
            toolCalls,
            usage: extra.usage,
            cache: extra.cache,
          });
          if (statReport) {
            const reportedBy = "scoutTaskChat tool";
            const promises = [
              statReport("steps", toolCalls.length, { reportedBy, scoutUserChatId, toolCalls }),
              statReport("tokens", tokens, { reportedBy, scoutUserChatId, ...extra }),
            ];
            tokensConsumed += tokens;
            await Promise.all(promises);
          }
          // appendStepToStreamingMessage(streamingMessage, step);
          // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
          //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
          // }
        },

        onFinish: async ({ steps, usage }) => {
          logger.info({ msg: "runScoutTaskChatStream streamText onFinish", usage });
          const message = convertStepsToAIMessage(steps);
          resolve(message);
        },

        onError: ({ error }) => {
          if ((error as Error).name === "AbortError") {
            logger.warn(`runScoutTaskChatStream streamText aborted: ${(error as Error).message}`);
          } else {
            logger.error(`runScoutTaskChatStream streamText onError: ${(error as Error).message}`);
            reject(error);
          }
        },

        abortSignal,
      });
      if (streamWriter) {
        streamWriter.merge(
          response.toUIMessageStream({
            generateMessageId: () => streamingMessage.id,
          }),
        );
      }
      // abortSignal 发生了以后，可能会进 consumeStream 的 then 也可能进 catch，搞不明白
      // 由于 abort 了以后就不会触发 onFinish，如果这里不 resolve/reject 就会导致 promise 一直不退出
      // 所以对于放进 promise 里的 streamText，除了设置 abortSignal 还需要单独监听 abortSignal 并 reject
      abortSignal.addEventListener("abort", () => {
        reject(new Error("runScoutTaskChatStream abortSignal received"));
      });
      // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
      // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
      response
        .consumeStream()
        .then(() => {})
        .catch((error) => reject(error));
    });

    try {
      await streamTextPromise;
    } catch (error) {
      if ((error as Error).message?.includes("RESOURCE_EXHAUSTED")) {
        // 如果遇到了用量限制，不报错，换个模型
        logger.warn(`Resource exhausted, switching to alternative model without token reduction`);
        reduceTokens = null;
      } else {
        throw error;
      }
    }

    // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
    await persistentAIMessageToDB({
      userChatId: scoutUserChatId,
      message: {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: CONTINUE_ASSISTANT_STEPS }],
      },
    });
  }
  // while loop end
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
//       const scoutUserChat = await createUserChat({
//         userId,
//         title,
//         kind: "scout",
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
