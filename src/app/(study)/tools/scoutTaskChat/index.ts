import "server-only";

import {
  appendStepToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, LLMModelName } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/error";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { StudyToolName } from "@/app/(study)/tools/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { startManagedRun } from "@/lib/userChat/runtime";
import { prisma } from "@/prisma/prisma";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  generateId,
  getToolName,
  isToolUIPart,
  smoothStream,
  streamText,
  tool,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { scoutSystem } from "./prompt";
import {
  scoutChatTools,
  scoutTaskChatInputSchema,
  scoutTaskChatOutputSchema,
  type ScoutTaskChatResult,
  type TPlatform,
} from "./types";

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
      const scoutLog = logger.child({
        userChatId: scoutUserChatId,
        userChatToken: scoutUserChatToken,
      });
      // 插入一条新的消息
      await persistentAIMessageToDB({
        mode: "append",
        userChatId: scoutUserChatId,
        message: {
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: description }],
        },
      });
      const managed = await startManagedRun({ userChatId: scoutUserChatId, logger: scoutLog });
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
        await managed.cleanup();
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
  const tools = { ...scoutChatTools({ locale, abortSignal, statReport, logger }) };
  const activeTools = Object.keys(tools) as (keyof typeof tools)[];
  const systemPrompt = scoutSystem({ locale });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(scoutUserChatId, {
    tools,
  });

  // ⚠️ 改用 onStepFinish 里面保存
  // const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
  //   scoutUserChatId,
  //   5000,
  //   logger,
  // ); // 5000 debounce

  const reduceTokens: TReduceTokens = {
    model: "gemini-3-flash",
    // model: "minimax-m2.1",
    ratio: 10,
  };
  let tokensConsumed = 0;

  const streamTextPromise = new Promise<Omit<UIMessage, "role">>((resolve, reject) => {
    const response = streamText({
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-sonnet-4-5"),
      // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "minimal",
        } satisfies OpenAIResponsesProviderOptions,
        google: {
          // Options are nested under 'google' for Vertex provider
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 2048, // Optional
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },

      system: systemPrompt,
      temperature: 0.5,
      messages: coreMessages,
      tools: tools,
      toolChoice: "required",
      activeTools: activeTools.filter((toolName) => toolName !== StudyToolName.toolCallError),
      experimental_repairToolCall: handleToolCallError, // 这个要求 tools 里面有 [StudyToolName.toolCallError]

      prepareStep: async ({ messages }) => {
        const toolUses = messages.reduce((acc, message) => {
          if (message.role === "assistant" && typeof message.content === "object") {
            const toolNames = message.content
              .filter((content) => content.type === "tool-call")
              .map((content) => content.toolName);
            return [...acc, ...toolNames];
          }
          return acc;
        }, [] as string[]);
        // 最多调用 15 次工具，因为还可能调用 reasoningThinking，额外加 2 次，此时，如果 stopWhen 还没触发，会强制输出一段文本，作为总结，然后结束
        if (toolUses.length >= 15 + 2) {
          return {
            model: llm("gemini-3.1-pro"),
            toolChoice: "none",
            activeTools: [],
            messages: [
              ...messages,
              {
                role: "user",
                content:
                  locale === "zh-CN"
                    ? "观察已充分，请描述你理解的这群人。"
                    : "Observation complete. Describe the people you've come to understand.",
              },
            ],
          };
        }
        if (
          toolUses.length >= 5 &&
          toolUses.filter((toolName) => toolName === StudyToolName.reasoningThinking).length < 1
        ) {
          logger.info(
            `ScoutTaskChat requires ReasoningThinking tool with current tool usage count at ${toolUses.length}`,
          );
          return {
            model: llm("gemini-3.1-pro"), // 临时换个模型，因为 gemini 2.5 喜欢一次性批量调用一批工具，这里 reduceTokens 没更新，问题不大
            toolChoice: "required",
            activeTools: [StudyToolName.reasoningThinking],
          };
        } else {
          return {
            // model: reduceTokens ? llm(reduceTokens.model) : llm("claude-sonnet-4-5"),
            // toolChoice: "required",
            activeTools: activeTools.filter(
              (toolName) =>
                toolName !== StudyToolName.reasoningThinking &&
                toolName !== StudyToolName.toolCallError,
            ),
          };
        }
      },

      // stopWhen: [stepCountIs(maxSteps)],
      stopWhen: async ({ steps }) => {
        if (tokensConsumed > 150_000) {
          // 达到了离谱的 token 消耗，无条件退出
          logger.error(
            `Token consumption ${tokensConsumed} exceeds limit ${150_000}, ending scout`,
          );
          return true;
        }
        // 最大 20 次工具调用
        return (
          steps.length >= 20 || steps.reduce((acc, step) => acc + step.toolCalls.length, 0) >= 20
        );
      },

      experimental_transform: smoothStream({
        delayInMs: 30,
        chunking: /[\u4E00-\u9FFF]|\S+\s+/,
      }),

      // ⚠️ 改用 onStepFinish 里面保存
      // onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof tools> }) => {
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
            mode: "override",
            userChatId: scoutUserChatId,
            message: streamingMessage,
          });
        }

        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
        if (statReport) {
          const reportedBy = "scoutTaskChat tool";
          const promises = [
            statReport("steps", toolCalls.length, { reportedBy, scoutUserChatId, toolCalls }),
            statReport("tokens", tokens, { reportedBy, scoutUserChatId, ...extra }),
          ];
          tokensConsumed += tokens;
          await Promise.all(promises);
        }
        logger.info({
          msg: "runScoutTaskChatStream streamText onStepFinish",
          toolCalls,
          usage: extra.usage,
          cache: extra.cache,
          totalTokensConsumed: tokensConsumed,
        });
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
    }); // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
    // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  await streamTextPromise;
}

// const LIMIT_SOCIAL_TOOLS_USE = 20; // 最多使用 20 次 social 搜索
// const socialToolCallCounts = (Object.keys(allTools) as StudyToolName[]).reduce((count, toolName) => {
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
