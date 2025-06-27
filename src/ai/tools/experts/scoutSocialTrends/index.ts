import "server-only";

import {
  appendChunkToStreamingMessage,
  CONTINUE_ASSISTANT_STEPS,
  convertStepsToAIMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import {
  scoutSocialTrendsSummarySystem,
  scoutSocialTrendsSystem,
} from "@/ai/prompt/scout/socialTrends";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  handleToolCallError,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  twitterPostCommentsTool,
  twitterSearchTool,
  twitterUserPostsTool,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/ai/tools/tools";
import { PlainTextToolResult, StatReporter, ToolName, TPlatform } from "@/ai/tools/types";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import {
  CoreMessage,
  DataStreamWriter,
  generateId,
  Message,
  smoothStream,
  streamText,
  TextStreamPart,
  tool,
  ToolChoice,
} from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";
import { ScoutSocialTrendsResult } from "./types";

const TOKENS_COMSUME_LIMIT = 250_000; // 限制 15w token 消耗量
const SCOUT_TOOLS_LIMIT = 15; // 进行 15 次搜索，结束以后保存画像
const SCOUT_MESSAGES_LIMIT = 10; // 最多 10 轮对话，结束以后保存画像
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

export const scoutSocialTrendsTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description:
      "Conduct comprehensive social media research to discover emerging trends, learn about emerging products, and listen to user preferences across multiple platforms.",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .optional()
        .describe(
          "Unique identifier for the search task used to create the task. You don't need to provide this - the system will automatically generate it.",
        )
        .transform(() => generateToken()),
      // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
      description: z
        .string()
        .describe(
          "Tell your detailed Research objective to this research agent. Use descriptive phrases like 'Help me find users who...', 'Research people interested in...', '帮我寻找...', or similar research requests.",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
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
      const scoutLog = studyLog.child({ scoutUserChatId, scoutUserChatToken });
      // 插入一条新的消息
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content: description,
      });
      // let hasError = false;
      let summary: string | undefined;
      try {
        summary = await runScoutSocialTrendsStream({
          locale,
          scoutUserChatId,
          abortSignal,
          statReport,
          scoutLog,
        });
      } catch (error) {
        scoutLog.error(`runScoutSocialTrendsStream failed: ${(error as Error).message}`);
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
        {} as NonNullable<ScoutSocialTrendsResult["stats"]>,
      );
      return {
        stats,
        summary,
        plainText:
          summary ||
          `Social media research completed successfully. Data collected from multiple platforms ready for persona building.\n\nPlatform Coverage:\n${JSON.stringify(stats)}`,
      };
    },
  });

async function runScoutSocialTrendsStream({
  scoutUserChatId,
  locale,
  abortSignal,
  statReport,
  scoutLog,
  streamWriter,
}: {
  scoutUserChatId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  scoutLog: Logger;
  streamWriter?: DataStreamWriter;
}): Promise<string | undefined> {
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
    [ToolName.twitterSearch]: twitterSearchTool,
    [ToolName.twitterUserPosts]: twitterUserPostsTool,
    [ToolName.twitterPostComments]: twitterPostCommentsTool,
    // [ToolName.toolCallError]: toolCallError,
  };
  const systemPrompt = scoutSocialTrendsSystem({ locale });
  const tools =
    locale === "zh-CN"
      ? allTools
      : (Object.fromEntries(
          Object.entries(allTools).filter(([key]) => !/^(xhs|dy)/.test(key)),
        ) as typeof allTools);

  let tokensConsumed = 0;
  let shouldSummarize = true;
  let breakReason = "";

  while (true) {
    const { coreMessages, streamingMessage, toolUseCount } =
      await prepareMessagesForStreaming(scoutUserChatId);

    if (tokensConsumed > TOKENS_COMSUME_LIMIT) {
      // 达到了离谱的 token 消耗，无条件退出
      scoutLog.error(
        `Token consumption ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}, ending scout`,
      );
      shouldSummarize = true;
      breakReason = "token_limit";
      break;
    }
    const scoutToolsCount = Object.values(toolUseCount).reduce((acc, value) => acc + value, 0);
    if (scoutToolsCount >= SCOUT_TOOLS_LIMIT) {
      // 达到了工具使用次数限制，无条件退出
      scoutLog.info(
        `Tool usage ${scoutToolsCount} exceeds limit ${SCOUT_TOOLS_LIMIT}, ending scout`,
      );
      shouldSummarize = true;
      breakReason = "tool_limit";
      break;
    }
    if (coreMessages.length >= SCOUT_MESSAGES_LIMIT) {
      // 达到了消息数量限制，无条件退出，有时候模型会不调用工具反复输出文本消息，所以这个限制需要加上
      scoutLog.info(
        `Message count ${coreMessages.length} exceeds limit ${SCOUT_MESSAGES_LIMIT}, ending scout`,
      );
      shouldSummarize = true;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let [reduceTokens, llmOptions]: [TReduceTokens, any] = [
      { model: "gemini-2.5-flash", ratio: 10 },
      {
        // useSearchGrounding: true,
        // dynamicRetrievalConfig: {
        //   mode: "MODE_DYNAMIC",
        //   dynamicThreshold: 0.5,
        // },
      },
    ];
    if (coreMessages.length > 2 && Object.keys(toolUseCount).length === 0) {
      // 两条消息以后，必须开始使用工具，但是为了不一直使用工具，调用2次先停下来，后面好重新判断 toolUseCount
      toolChoice = "required";
      maxSteps = 1;
    }
    const { debouncePersistentMessage, immediatePersistentMessage } =
      createDebouncePersistentMessage(scoutUserChatId, 5000, scoutLog); // 5000 debounce
    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const response = streamText({
        model: reduceTokens ? llm(reduceTokens.model, llmOptions) : llm("claude-3-7-sonnet"),
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
            msg: "runScoutSocialTrendsStream streamText onStepFinish",
            stepType: step.stepType,
            toolCalls,
            usage,
          });
          if (statReport) {
            const reportedBy = "scoutSocialTrends tool";
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
          scoutLog.info({ msg: "runScoutSocialTrendsStream streamText onFinish", usage });
          const message = convertStepsToAIMessage(steps);
          resolve(message);
        },
        onError: ({ error }) => {
          scoutLog.error(
            `runScoutSocialTrendsStream streamText onError: ${(error as Error).message}`,
          );
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
      scoutLog.info(
        `runScoutSocialTrendsStream stream complete: ${message.content.substring(0, 20)}`,
      );
    } catch (error) {
      const errMsg = (error as Error).message;
      scoutLog.error(`runScoutSocialTrendsStream stream error: ${errMsg}`);
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        // 如果遇到了用量限制，不报错，换个模型
        scoutLog.warn(`Resource exhausted, switching to alternative model without token reduction`);
        reduceTokens = null;
        llmOptions = null;
      } else {
        await clearBackgroundToken();
        throw error;
      }
    }

    // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
    await persistentAIMessageToDB(scoutUserChatId, {
      id: generateId(),
      role: "user",
      content: CONTINUE_ASSISTANT_STEPS,
    });
  }

  // Handle summarization if needed
  if (shouldSummarize) {
    scoutLog.info(`Ending search due to ${breakReason}, requesting summarization`);

    try {
      const summaryText = await runScoutSocialTrendsSummarize({
        scoutUserChatId,
        locale,
        abortSignal,
        statReport,
        scoutLog,
        streamWriter,
      });
      scoutLog.info(`Summarization complete: ${summaryText.substring(0, 50)}...`);
      // Clean up and return the summary
      await clearBackgroundToken();
      return summaryText;
    } catch (error) {
      scoutLog.error(`Summarization error: ${(error as Error).message}`);
      await clearBackgroundToken();
      throw error;
    }
  }

  // while loop end
  // 完全结束以后，清理 backgroundToken
  await clearBackgroundToken();
  return undefined;
}

async function runScoutSocialTrendsSummarize({
  scoutUserChatId,
  locale,
  abortSignal,
  statReport,
  scoutLog,
  streamWriter,
}: {
  scoutUserChatId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  scoutLog: Logger;
  streamWriter?: DataStreamWriter;
}) {
  // Use the same message preparation as the main loop
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId);

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
    scoutLog.warn("No valid messages found for summarization, using fallback");
    return "No search results available to summarize.";
  }

  // Push a user message to the coreMessages array at the bottom, requesting summarizing according to history messages
  const summarizeRequestMessage: CoreMessage = {
    role: "user",
    content:
      locale === "zh-CN"
        ? "请根据以上搜索对话内容，为我的初始研究请求提供一个全面、详细的总结。"
        : "Please provide a comprehensive and detailed summary for my initial research request based on the above search conversation.",
  };

  const finalMessages = [...filteredMessages, summarizeRequestMessage];

  // Create a simple system prompt for summarization
  const summarizationSystemPrompt = scoutSocialTrendsSummarySystem({ locale });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reduceTokens, llmOptions]: [TReduceTokens, any] = [
    { model: "gemini-2.5-flash", ratio: 10 },
    {
      // useSearchGrounding: true,
      // dynamicRetrievalConfig: {
      //   mode: "MODE_DYNAMIC",
      //   dynamicThreshold: 0.5,
      // },
    },
  ];

  // Use streamText just like the main loop
  const streamTextPromise = new Promise<string>((resolve, reject) => {
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model, llmOptions) : llm("claude-3-7-sonnet"),
      // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
      providerOptions: providerOptions,
      system: summarizationSystemPrompt,
      temperature: 0.5,
      messages: finalMessages,
      // No tools needed for summarization
      experimental_repairToolCall: handleToolCallError,
      maxSteps: 1,
      onChunk: async ({ chunk }) => {
        scoutLog.debug({ chunk });
      },
      onStepFinish: async (step) => {
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const usage = step.usage;
        scoutLog.info({
          msg: "runScoutSocialTrendsSummarize streamText onStepFinish",
          stepType: step.stepType,
          toolCalls,
          usage,
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
          ];
          if (usage.totalTokens > 0) {
            let tokens = usage.totalTokens;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra: any = { reportedBy, scoutUserChatId, usage, step: "summary" };
            if (reduceTokens) {
              extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
              tokens = Math.ceil(tokens / reduceTokens.ratio);
            }
            promises.push(statReport("tokens", tokens, extra));
          }
          await Promise.all(promises);
        }
        // appendStepToStreamingMessage(streamingMessage, step);
        // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
        // }
      },
      onFinish: async ({ usage, text }) => {
        scoutLog.info({ msg: "runScoutSocialTrendsSummarize streamText onFinish", usage });
        resolve(text);
      },
      onError: ({ error }) => {
        scoutLog.error(
          `runScoutSocialTrendsSummarize streamText onError: ${(error as Error).message}`,
        );
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

  const summaryText = await streamTextPromise;
  return summaryText;
}
