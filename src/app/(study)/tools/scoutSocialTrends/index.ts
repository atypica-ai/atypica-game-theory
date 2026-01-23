import "server-only";

import {
  appendStepToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/error";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { StudyToolName } from "@/app/(study)/tools/types";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import {
  generateId,
  getToolName,
  isToolUIPart,
  ModelMessage,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  ToolChoice,
  ToolSet,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { createBackgroundToken } from "../scoutTaskChat";
import { scoutChatTools, TPlatform } from "../scoutTaskChat/types";
import { scoutSocialTrendsSummarySystem, scoutSocialTrendsSystem } from "./prompt";
import {
  scoutSocialTrendsInputSchema,
  scoutSocialTrendsOutputSchema,
  type ScoutSocialTrendsResult,
} from "./types";

const TOKENS_COMSUME_LIMIT = 250_000; // 限制 15w token 消耗量
const SCOUT_TOOLS_LIMIT = 15; // 进行 15 次搜索，结束以后保存画像
const SCOUT_MESSAGES_LIMIT = 10; // 最多 10 轮对话，结束以后保存画像
type TReduceTokens = {
  model: LLMModelName;
  ratio: number;
} | null;

const toolPlatform = (toolName: StudyToolName): TPlatform | undefined => {
  const platforms: Partial<Record<StudyToolName, TPlatform>> = {
    [StudyToolName.xhsNoteComments]: "小红书",
    [StudyToolName.xhsSearch]: "小红书",
    [StudyToolName.xhsUserNotes]: "小红书",
    [StudyToolName.dySearch]: "抖音",
    [StudyToolName.dyPostComments]: "抖音",
    [StudyToolName.dyUserPosts]: "抖音",
    [StudyToolName.tiktokSearch]: "TikTok",
    [StudyToolName.tiktokPostComments]: "TikTok",
    [StudyToolName.tiktokUserPosts]: "TikTok",
    [StudyToolName.insSearch]: "Instagram",
    [StudyToolName.insUserPosts]: "Instagram",
    [StudyToolName.insPostComments]: "Instagram",
    [StudyToolName.twitterSearch]: "Twitter",
    [StudyToolName.twitterUserPosts]: "Twitter",
    [StudyToolName.twitterPostComments]: "Twitter",
  };
  return platforms[toolName];
};

export const scoutSocialTrendsTool = ({
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
      "Conduct comprehensive social media research to discover emerging trends, learn about emerging products, and listen to user preferences across multiple platforms.",
    inputSchema: scoutSocialTrendsInputSchema,
    outputSchema: scoutSocialTrendsOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ scoutUserChatToken, description }) => {
      const title = description.substring(0, 50);
      // 现在不需要复用一个 scoutTask 了，因为可以随时对一个 scoutTask 构建人设 buildPersona，所以每次都创建新的
      const scoutUserChat = await createUserChat({
        userId,
        title,
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
      // let hasError = false;
      let summary: string;
      try {
        summary = await runScoutSocialTrendsStream({
          locale,
          scoutUserChatId,
          abortSignal,
          statReport,
          logger: scoutLog,
        });
      } catch (error) {
        throw error;
        // hasError = true;
        // 出错的保持没有 result 的状态，抛出错误让 study 停止，
        // - study 不会因为错误而过度消耗，进而需要人为介入
        // - toolUseCount 不统计没有 result 的 tool
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
              const toolName = getToolName(part) as StudyToolName;
              const platform = toolPlatform(toolName);
              if (platform) {
                stats[platform] = (stats[platform] || 0) + 1;
              }
            }
          });
          return stats;
        },
        {} as NonNullable<ScoutSocialTrendsResult["stats"]>,
      );
      return {
        stats,
        summary,
        plainText: `${summary}\n\nSocial media research completed successfully.\n\nPlatform Coverage:\n${JSON.stringify(stats)}`,
      };
    },
  });

async function runScoutSocialTrendsStream({
  scoutUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
  streamWriter,
}: {
  scoutUserChatId: number;
  streamWriter?: UIMessageStreamWriter;
} & AgentToolConfigArgs): Promise<string> {
  const allTools = {
    ...scoutChatTools({ locale, statReport, abortSignal, logger }),
  };
  const systemPrompt = scoutSocialTrendsSystem({ locale });
  const tools =
    locale === "zh-CN"
      ? allTools
      : (Object.fromEntries(
          Object.entries(allTools).filter(([key]) => !/^(xhs|dy)/.test(key)),
        ) as typeof allTools);

  let tokensConsumed = 0;
  let breakReason = "";

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
      breakReason = "token_limit";
      break;
    }
    const scoutToolsCount = Object.values(toolUseCount).reduce((acc, value) => acc + value, 0);
    if (scoutToolsCount >= SCOUT_TOOLS_LIMIT) {
      // 达到了工具使用次数限制，无条件退出
      logger.info(`Tool usage ${scoutToolsCount} exceeds limit ${SCOUT_TOOLS_LIMIT}, ending scout`);
      breakReason = "tool_limit";
      break;
    }
    if (coreMessages.length >= SCOUT_MESSAGES_LIMIT) {
      // 达到了消息数量限制，无条件退出，有时候模型会不调用工具反复输出文本消息，所以这个限制需要加上
      logger.info(
        `Message count ${coreMessages.length} exceeds limit ${SCOUT_MESSAGES_LIMIT}, ending scout`,
      );
      breakReason = "message_limit";
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

    // ⚠️ 改用 onStepFinish 里面保存
    // const { debouncePersistentMessage, immediatePersistentMessage } =
    //   createDebouncePersistentMessage(scoutUserChatId, 5000, logger); // 5000 debounce

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
                //   dynamicThreshold: 0.5, // threshold 越小，使用搜索的可能性就越高
                // }),
              }
            : tools,
        toolChoice: toolChoice,
        experimental_repairToolCall: handleToolCallError,
        stopWhen: stepCountIs(maxSteps),

        experimental_transform: smoothStream({
          delayInMs: 30,
          chunking: /[\u4E00-\u9FFF]|\S+\s+/,
        }),

        // ⚠️ 改用 onStepFinish 里面保存
        // onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof allTools> }) => {
        //   appendChunkToStreamingMessage(streamingMessage, chunk);
        //   await debouncePersistentMessage(streamingMessage, {
        //     immediate:
        //       chunk.type !== "text-delta" &&
        //       chunk.type !== "reasoning-delta" &&
        //       chunk.type !== "tool-input-delta",
        //     // 只在 text-delta 类型的时候才 debounce，靠谱点。see https://github.com/bmrlab/atypica-llm-app/issues/40
        //     // immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
        //   });
        // },

        onStepFinish: async (step) => {
          // ⚠️ 现在改用 onStepFinish 里面保存，下面这一行是搭配 debouncePersistentMessage 使用的
          // await immediatePersistentMessage();
          // 注意，stepFinish 一定要保存，并且强制 immediate:true
          // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
          // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
          // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整

          appendStepToStreamingMessage(streamingMessage, step);
          if (streamingMessage.parts?.length) {
            await persistentAIMessageToDB({
              userChatId: scoutUserChatId,
              message: streamingMessage,
            });
          }

          const toolCalls = step.toolCalls.map((call) => call.toolName);
          const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
          logger.info({
            msg: "runScoutSocialTrendsStream streamText onStepFinish",
            toolCalls,
            usage: extra.usage,
            cache: extra.cache,
          });
          if (statReport) {
            const reportedBy = "scoutSocialTrends tool";
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
          logger.info({ msg: "runScoutSocialTrendsStream streamText onFinish", usage });
          const message = convertStepsToAIMessage(steps);
          resolve(message);
        },

        onError: ({ error }) => {
          if ((error as Error).name === "AbortError") {
            logger.warn(
              `runScoutSocialTrendsStream streamText aborted: ${(error as Error).message}`,
            );
          } else {
            logger.error(
              `runScoutSocialTrendsStream streamText onError: ${(error as Error).message}`,
            );
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
      abortSignal.addEventListener("abort", () => {
        reject(new Error("runScoutSocialTrendsStream abortSignal received"));
      });
      response
        .consumeStream()
        .then(() => {})
        .catch((error) => reject(error));
    });

    try {
      await streamTextPromise;
    } catch (error) {
      const errMsg = (error as Error).message;
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
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

  logger.info(`Ending search due to ${breakReason}, requesting summarization`);
  const summaryText = await runScoutSocialTrendsSummarize({
    scoutUserChatId,
    locale,
    abortSignal,
    statReport,
    logger,
    streamWriter,
  });
  return summaryText;
}

async function runScoutSocialTrendsSummarize({
  scoutUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
  streamWriter,
}: {
  scoutUserChatId: number;
  streamWriter?: UIMessageStreamWriter;
} & AgentToolConfigArgs) {
  // Use the same message preparation as the main loop
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId, {
    tools: {} as ToolSet, // 没用到任何 tool
  });

  // Filter out all user messages except the first ever user message, which is the initial request
  const filteredMessages = coreMessages.filter((message, index) => {
    // Keep the first user message (initial research request)
    if (message.role === "user" && index !== 0) {
      return false;
    }
    // Everything elese is kept
    return true;
  });

  // Ensure we have at least one message
  if (filteredMessages.length === 0) {
    logger.warn("No valid messages found for summarization, using fallback");
    return "No search results available to summarize.";
  }

  // Push a user message to the coreMessages array at the bottom, requesting summarizing according to history messages
  const summarizeRequestMessage: ModelMessage = {
    role: "user",
    content:
      locale === "zh-CN"
        ? "请根据以上搜索对话内容，为我的初始研究请求提供一个全面、详细的总结。"
        : "Please provide a comprehensive and detailed summary for my initial research request based on the above search conversation.",
  };

  const finalMessages = [...filteredMessages, summarizeRequestMessage];

  // Create a simple system prompt for summarization
  const summarizationSystemPrompt = scoutSocialTrendsSummarySystem({ locale });

  const reduceTokens: TReduceTokens = { model: "gemini-2.5-flash", ratio: 10 };

  // Use streamText just like the main loop
  const streamTextPromise = new Promise<string>((resolve, reject) => {
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),

      // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
      providerOptions: defaultProviderOptions,

      system: summarizationSystemPrompt,
      temperature: 0.5,
      messages: finalMessages,

      // No tools needed for summarization
      experimental_repairToolCall: handleToolCallError,

      stopWhen: stepCountIs(1),

      onChunk: async ({ chunk }) => {
        logger.debug({ chunk });
      },

      onStepFinish: async (step) => {
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
        logger.info({
          msg: "runScoutSocialTrendsSummarize streamText onStepFinish",
          toolCalls,
          usage: extra.usage,
          cache: extra.cache,
        });
        if (statReport) {
          const reportedBy = "scoutSocialTrends tool";
          const promises = [
            statReport("steps", toolCalls.length, {
              reportedBy,
              scoutUserChatId,
              toolCalls,
              step: "summary",
            }),
            statReport("tokens", tokens, {
              reportedBy,
              scoutUserChatId,
              step: "summary",
              ...extra,
            }),
          ];
          await Promise.all(promises);
        }
        // appendStepToStreamingMessage(streamingMessage, step);
        // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
        // }
      },

      onFinish: async ({ usage, text }) => {
        logger.info({ msg: "runScoutSocialTrendsSummarize streamText onFinish", usage });
        resolve(text);
      },

      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(
            `runScoutSocialTrendsSummarize streamText aborted: ${(error as Error).message}`,
          );
        } else {
          logger.error(
            `runScoutSocialTrendsSummarize streamText onError: ${(error as Error).message}`,
          );
          reject(error);
        }
      },

      abortSignal,
    });
    if (streamWriter) {
      streamWriter.merge(
        response.toUIMessageStream({
          // generateMessageId: () => streamingMessage.id, // 需要 streamWriter 的那个测试页面，不需要保存消息，这里不需要设置
        }),
      );
    }
    abortSignal.addEventListener("abort", () => {
      reject(new Error("runScoutSocialTrendsSummarize abortSignal received"));
    });
    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const summaryText = await streamTextPromise;
  return summaryText;
}
