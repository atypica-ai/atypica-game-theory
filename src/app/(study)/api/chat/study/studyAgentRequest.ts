import { appendChunkToStreamingMessage, createDebouncePersistentMessage } from "@/ai/messageUtils";
import { studySystem } from "@/ai/prompt";
import { fixFileNameInMessageToUsePromptCache, llm, providerOptions } from "@/ai/provider";
import { initStudyStatReporter } from "@/ai/tools/stats";
import {
  buildPersonaTool,
  generateReportTool,
  handleToolCallError,
  interviewChatTool,
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  scoutTaskChatTool,
  searchPersonasTool,
  toolCallError,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, ToolName } from "@/ai/tools/types";
import { setUserChatError } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import {
  CoreMessage,
  Message,
  smoothStream,
  StepResult,
  streamText,
  TextStreamPart,
  ToolChoice,
} from "ai";
import { getLocale } from "next-intl/server";
import { Logger } from "pino";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { notifyReportCompletion, notifyStudyInterruption } from "./notify";

// autopolot 模式默认 15 步，webSearch 2 + saveAnalyst 1 + searchPersonas 1 + scoutTaskChat 2 + buildPersona 2 + interviewChat 2 + saveAnalystStudySummary 1 + generateReport 1
const MAX_STEPS_EACH_ROUND = 15;
// const TOKENS_COMSUME_LIMIT = 1_000_000; // 最新统计来看，100 万 tokens 足够

export async function outOfBalance({ userId }: { userId: number }) {
  const userTokens = await prisma.userTokens.findUniqueOrThrow({
    where: { userId },
  });
  return userTokens.permanentBalance + userTokens.monthlyBalance <= 0;
}

/**
 * claude 模型支持 cache https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
 * 最多 4 个 checkpoints，checkpoint 至少 1024 tokens, study agent 第一个 assistant 消息回复以后至少有这个 token 量
 */
export function setBedrockCache(model: `claude-${string}`, coreMessages: CoreMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    firstAssistant: false,
    saveAnalystStudySummary: false,
    ">=8": false,
    ">=16": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
    if (message.role === "assistant" && !checkpoints["firstAssistant"]) {
      checkpoints["firstAssistant"] = true;
      return { ...message, providerOptions };
    }
    if (
      message.role === "assistant" &&
      Array.isArray(message.content) &&
      message.content.find(
        (content) =>
          content.type === "tool-call" && content.toolName === ToolName.saveAnalystStudySummary,
      ) &&
      !checkpoints["saveAnalystStudySummary"]
    ) {
      checkpoints["saveAnalystStudySummary"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=8"]) {
      checkpoints[">=8"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 16 && !checkpoints[">=16"]) {
      checkpoints[">=16"] = true;
      return { ...message, providerOptions };
    }
    return { ...message };
  });
  return cachedCoreMessages;
}

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function studyAgentRequest({
  briefStatus = "DRAFT",
  studyUserChatId,
  coreMessages,
  streamingMessage,
  toolUseCount,
  userId,
  // reqSignal,
  studyLog,
}: {
  briefStatus?: "CLARIFIED" | "DRAFT";
  studyUserChatId: number;
  coreMessages: CoreMessage[];
  streamingMessage: Omit<Message, "role"> & {
    parts: NonNullable<Message["parts"]>;
    role: "assistant";
  };
  toolUseCount: Partial<Record<ToolName, number>>;
  userId: number;
  reqSignal: AbortSignal | null;
  studyLog: Logger;
}) {
  const locale = await getLocale();
  const { statReport } = initStudyStatReporter({ userId, studyUserChatId, studyLog });
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    studyLog,
  ); // 5s debounce

  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger: studyLog,
  };
  const allTools = {
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.webSearch]: webSearchTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.saveAnalyst]: saveAnalystTool({ studyUserChatId }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ ...agentToolArgs }),
    [ToolName.searchPersonas]: searchPersonasTool({ ...agentToolArgs }),
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, ...agentToolArgs }),
    [ToolName.buildPersona]: buildPersonaTool({ userId, ...agentToolArgs }),
    [ToolName.interviewChat]: interviewChatTool({ userId, studyUserChatId, ...agentToolArgs }),
    [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool({ studyUserChatId }),
    [ToolName.generateReport]: generateReportTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.toolCallError]: toolCallError,
  };
  let tools: Partial<typeof allTools> = allTools;
  const toolChoice: ToolChoice<typeof allTools> = "auto";
  const maxTokens: number | undefined = undefined;
  let maxSteps = MAX_STEPS_EACH_ROUND;

  if ((toolUseCount[ToolName.generateReport] ?? 0) >= 1) {
    // ⚠️ 一旦报告生成，后面就不允许构建人设和搜索等其他操作了，但是可以继续和报告进行问答，也可以重新生成报告
    tools = Object.fromEntries(
      Object.entries(allTools).filter(([key]) =>
        [
          // ToolName.requestInteraction,
          ToolName.generateReport,
          ToolName.reasoningThinking,
          ToolName.toolCallError,
        ].includes(key as ToolName),
      ),
    ) as typeof allTools;
    maxSteps = 2;
  }

  if (briefStatus === "CLARIFIED") {
    delete tools[ToolName.requestInteraction];
  }

  // const tokensConsumed =
  //   (
  //     await prisma.chatStatistics.aggregate({
  //       where: { userChatId: studyUserChatId, dimension: "tokens" },
  //       _sum: { value: true },
  //     })
  //   )._sum.value ?? 0;
  // 超出 tokens 限制以后，这时候每 chat 一次，就是一个很大的 input tokens 数量，所以，不能再继续发送消息，直接返回一个特定的消息
  // 不过现在做了 prompt cache，是不是不大容易超出了？要留意一段日子
  // if (tokensConsumed >= TOKENS_COMSUME_LIMIT) {
  //   studyLog.error(`tokensConsumed ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}`);
  //   const locale = await getLocale();
  //   const message =
  //     locale === "zh-CN"
  //       ? "当前研究已达 Token 上限，无法继续。您可以创建一个新的研究项目继续，或通过右下角的客服聊天窗口联系我们获取帮助"
  //       : "You have reached the tokens limit for this study. You can create a new study project to continue, or contact us through the customer service chat window in the lower right corner for assistance.";
  //   return createDataStreamResponse({
  //     execute: async (dataStream) => {
  //       dataStream.write(formatDataStreamPart("start_step", { messageId: "study-tokens-limit" }));
  //       dataStream.write(formatDataStreamPart("text", message));
  //       dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
  //     },
  //   });
  // }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const system = studySystem({
    locale,
    briefStatus,
    // 为了 prompt cache 生效，需要一个固定的 system prompt，之前放在 system prompt 里面的 tokensStat, toolUseStat 现在去掉了
  });
  let streamStartTime = Date.now();
  const cachedCoreMessages = setBedrockCache("claude-3-7-sonnet", coreMessages);

  // 清除之前的错误信息（如果有的话）
  await setUserChatError(studyUserChatId, null);

  const streamTextResult = streamText({
    // model: llm("claude-sonnet-4"),
    model: fixFileNameInMessageToUsePromptCache(llm("claude-3-7-sonnet")),
    providerOptions: providerOptions,
    system: system,
    messages: cachedCoreMessages,
    tools: tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    maxSteps: maxSteps,
    maxTokens: maxTokens,
    // 注意，这里要使用 streamingMessage 的 id，虽然目前不指定只有 study agent 会遇到问题
    // 问题是这样，保存数据库用的是 streamingMessage.id，但是 streamText 会给新的 assistant 消息生成一个新的 id，并且在 toDataStreamResponse 里返回给前端
    // 当前端调用 addToolResult 的时候，会返回来一条新 id 的 assistang 消息，然后调用 persistentAIMessageToDB 插入的时候，会插入一条新的消息
    experimental_generateMessageId: () => streamingMessage.id,
    // https://sdk.vercel.ai/docs/ai-sdk-ui/smooth-stream-chinese
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
    onStepFinish: async (step: StepResult<typeof allTools>) => {
      await immediatePersistentMessage();
      // 注意，stepFinish 一定要保存，并且 immediate:true，前面等待中的 chunk persistent 会被去掉，没影响
      // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
      // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
      // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整
      // 到了这里的 tool calling step 一定是有 result 的，所以得在上面 onChunk 里面获取 call 阶段的 tool
      const toolCalls = step.toolCalls.map((call) => call.toolName);
      const usage = step.usage;
      const cache = step.providerMetadata?.bedrock?.usage as
        | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
        | undefined;
      studyLog.info({
        msg: "studyAgentRequest streamText onStepFinish",
        stepType: step.stepType,
        toolCalls,
        usage,
        cache,
      });
      if (statReport) {
        const reportedBy = "study chat";
        const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
        streamStartTime = Date.now();
        const promises = [
          statReport("duration", seconds, { reportedBy }),
          statReport("steps", toolCalls.length, { reportedBy, toolCalls }),
        ];
        if (usage.totalTokens > 0) {
          const tokens =
            usage.totalTokens +
            Math.floor((cache?.cacheReadInputTokens || 0) / 10) +
            Math.floor((cache?.cacheWriteInputTokens || 0) * 1.25);
          promises.push(statReport("tokens", tokens, { reportedBy, usage, cache }));
        }
        await Promise.all(promises);
      }
      if (await outOfBalance({ userId })) {
        studyLog.warn("User out of balance, aborting study agent");
        // 用完 tokens 以后，只要停止 streamText 就行，不需要做其他事情
        // 到 onStepFinish 的时候，所有 tool 肯定都已经停止，只需要 abort study
        safeAbort(studyAbortController);
      }
      {
        const generateReportTool = step.toolResults.find(
          (tool) => tool.toolName === ToolName.generateReport,
        );
        if (generateReportTool) {
          notifyReportCompletion({
            // reportToken: generateReportTool.args.reportToken,
            reportToken:
              generateReportTool.result.reportToken || generateReportTool.args.reportToken, // 要先取 result 里的
            studyUserChatId,
            studyLog,
          }).catch(() => {}); //不 await
        }
      }
    },
    onFinish: async ({ usage, providerMetadata }) => {
      const cache = providerMetadata?.bedrock?.usage;
      studyLog.info({ msg: "studyAgentRequest streamText onFinish", usage, cache });
      await clearBackgroundToken();
    },
    onError: async ({ error }) => {
      // 这里也包括 tool calling 里面直接 throw 的异常
      studyLog.error(`studyAgentRequest streamText onError: ${(error as Error).message}`);
      // @IMPORTANT 这很重要, 中断所有的 tool calling 里可能还在运行的 streamText
      safeAbort(toolAbortController);
      await clearBackgroundToken();
      try {
        // 记录错误信息到数据库
        await setUserChatError(studyUserChatId, (error as Error).message);
      } catch (dbError) {
        studyLog.error(`Error saving error to database: ${(dbError as Error).message}`);
      }
      {
        // 因为 token 不足 abort 不会触发 onError，如果要通知 token 不足，需要单独触发
        notifyStudyInterruption({
          studyUserChatId,
          studyLog,
        }).catch(() => {}); //不 await
      }
    },
    abortSignal: studyAbortController.signal,
  });

  studyAbortController.signal.addEventListener("abort", async () => {
    await clearBackgroundToken();
  });

  backgroundChatUntilCancel({
    studyLog,
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    toolAbortController,
    studyAbortController,
  });

  return streamTextResult.toDataStreamResponse();
}
