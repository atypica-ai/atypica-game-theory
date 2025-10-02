import { appendChunkToStreamingMessage, createDebouncePersistentMessage } from "@/ai/messageUtils";
import { productRnDSystem } from "@/ai/prompt/study/productRnD";
import { defaultProviderOptions, fixFileNameInMessageToUsePromptCache, llm } from "@/ai/provider";
import { initStudyStatReporter } from "@/ai/tools/stats";
import {
  audienceCallTool,
  generateReportTool,
  handleToolCallError,
  saveAnalystTool,
  saveInnovationSummaryTool,
  scoutSocialTrendsTool,
  toolCallError,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, ToolName } from "@/ai/tools/types";
import { setUserChatError } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import {
  ModelMessage,
  smoothStream,
  stepCountIs,
  StepResult,
  streamText,
  TextStreamPart,
  ToolChoice,
  UIMessage,
} from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { notifyReportCompletion, notifyStudyInterruption } from "./notify";
import { outOfBalance, setBedrockCache } from "./studyAgentRequest";

const MAX_STEPS_EACH_ROUND = 15; // streamText 默认 15 步

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function productRnDAgentRequest({
  studyUserChatId,
  coreMessages,
  streamingMessage,
  toolUseCount,
  userId,
  // reqSignal,
  studyLog,
  locale,
}: {
  studyUserChatId: number;
  coreMessages: ModelMessage[];
  streamingMessage: Omit<UIMessage, "role"> & {
    parts: NonNullable<UIMessage["parts"]>;
    role: "assistant";
  };
  toolUseCount: Partial<Record<ToolName, number>>;
  userId: number;
  reqSignal: AbortSignal | null;
  studyLog: Logger;
  locale: Locale;
}) {
  const { statReport } = initStudyStatReporter({ userId, studyUserChatId, studyLog });
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    studyLog,
  );

  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger: studyLog,
  };
  const allTools = {
    [ToolName.saveAnalyst]: saveAnalystTool({ studyUserChatId, productRnD: true }),
    [ToolName.audienceCall]: audienceCallTool({ ...agentToolArgs }),
    [ToolName.scoutSocialTrends]: scoutSocialTrendsTool({ userId, ...agentToolArgs }),
    [ToolName.saveAnalystStudySummary]: saveInnovationSummaryTool({ studyUserChatId }),
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
          // ToolName.saveAnalystStudySummary,
          ToolName.generateReport,
          ToolName.toolCallError,
        ].includes(key as ToolName),
      ),
    ) as typeof allTools;
    maxSteps = 2;
  }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const system = productRnDSystem({ locale });
  let streamStartTime = Date.now();
  const cachedCoreMessages = setBedrockCache("claude-3-7-sonnet", coreMessages);

  // 清除之前的错误信息（如果有的话）
  await setUserChatError(studyUserChatId, null);

  const streamTextResult = streamText({
    // model: llm("claude-sonnet-4"),
    model: fixFileNameInMessageToUsePromptCache(llm("claude-3-7-sonnet")),

    providerOptions: defaultProviderOptions,
    system: system,
    messages: cachedCoreMessages,
    tools: tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens: maxTokens,

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
      const cache = step.providerOptions?.bedrock?.usage as
        | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
        | undefined;
      studyLog.info({
        msg: "productRnDAgentRequest streamText onStepFinish",
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
        if (usage.totalTokens && usage.totalTokens > 0) {
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

    onFinish: async ({ usage, providerOptions }) => {
      const cache = providerOptions?.bedrock?.usage;
      studyLog.info({ msg: "productRnDAgentRequest streamText onFinish", usage, cache });
      await clearBackgroundToken();
    },

    onError: async ({ error }) => {
      // 如果 tool calling 里面直接 throw 异常，会进入这里的 onError
      if (/Error executing tool.*abortSignal received/.test((error as Error).message)) {
        studyLog.warn(`productRnDAgentRequest tool call aborted: ${(error as Error).message}`);
        // 不需要 abort study，发起 abort tool 的地方一定会 abort study
        // 不需要 clear background token，因为发起 abort tool 的原因就是 background token 被清空，就算不是，也会在接下来 abort study 以后被清空
        // 不需要记录错误信息或者 notifyStudyInterruption
        return;
      }
      studyLog.error(`productRnDAgentRequest streamText onError: ${(error as Error).message}`);
      // @IMPORTANT 这很重要, 中断所有的 tool calling 里可能还在运行的 streamText
      safeAbort(toolAbortController);
      await clearBackgroundToken();
      try {
        // 记录错误信息到数据库
        await setUserChatError(studyUserChatId, (error as Error).message);
      } catch (dbError) {
        studyLog.error(`Error saving error to database: ${(dbError as Error).message}`);
      }
      // 因为 token 不足 abort 不会触发 onError，如果要通知 token 不足，需要单独触发
      notifyStudyInterruption({
        studyUserChatId,
        studyLog,
      }).catch(() => {}); //不 await
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

  return streamTextResult.toUIMessageStreamResponse({
    // 注意，这里要使用 streamingMessage 的 id，虽然目前不指定只有 study agent 会遇到问题
    // 问题是这样，保存数据库用的是 streamingMessage.id，但是 streamText 会给新的 assistant 消息生成一个新的 id，并且在 toDataStreamResponse 里返回给前端
    // 当前端调用 addToolResult 的时候，会返回来一条新 id 的 assistang 消息，然后调用 persistentAIMessageToDB 插入的时候，会插入一条新的消息
    generateMessageId: () => streamingMessage.id,
  });
}
