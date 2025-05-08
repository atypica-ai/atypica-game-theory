import { llm, providerOptions } from "@/lib/llm";
import { appendChunkToStreamingMessage, createDebouncePersistentMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { studySystem } from "@/prompt";
import {
  buildPersonaTool,
  generateReportTool,
  handleToolCallError,
  initStudyStatReporter,
  interviewChatTool,
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  scoutTaskChatTool,
  toolCallError,
  ToolName,
} from "@/tools";
import {
  CoreMessage,
  createDataStreamResponse,
  formatDataStreamPart,
  Message,
  smoothStream,
  StepResult,
  streamText,
  TextStreamPart,
  ToolChoice,
} from "ai";
import { getLocale } from "next-intl/server";
import { Logger } from "pino";
import { createAbortSignals } from "./abortSignal";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";

const MAX_STEPS_EACH_ROUND = 15; // streamText 默认 15 步
const TOOL_USE_LIMIT = {
  [ToolName.scoutTaskChat]: 2,
  [ToolName.generateReport]: 2,
};
const TOKENS_COMSUME_LIMIT = 1_000_000; // 最新统计来看，100 万 tokens 足够

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function studyAgentRequest({
  studyUserChatId,
  coreMessages,
  streamingMessage,
  toolUseCount,
  userId,
  reqSignal,
  studyLog,
}: {
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
  const { abortController, abortSignal, delayedAbortSignal } = createAbortSignals(reqSignal);
  const { statReport } = initStudyStatReporter({ userId, studyUserChatId, studyLog });
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    studyLog,
  ); // 5000 debounce

  const tokensConsumed =
    (
      await prisma.chatStatistics.aggregate({
        where: { userChatId: studyUserChatId, dimension: "tokens" },
        _sum: { value: true },
      })
    )._sum.value ?? 0;
  const allTools = {
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, abortSignal, statReport, studyLog }),
    [ToolName.buildPersona]: buildPersonaTool({ userId, abortSignal, statReport, studyLog }),
    [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool(),
    [ToolName.saveAnalyst]: saveAnalystTool({ userId, studyUserChatId }),
    [ToolName.interviewChat]: interviewChatTool({ userId, abortSignal, statReport, studyLog }),
    [ToolName.generateReport]: generateReportTool({ abortSignal, statReport, studyLog }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.toolCallError]: toolCallError,
  };
  const tools: Partial<typeof allTools> = allTools;
  const toolChoice: ToolChoice<typeof allTools> = "auto";
  const maxTokens: number | undefined = undefined;
  let maxSteps = MAX_STEPS_EACH_ROUND;
  if ((toolUseCount[ToolName.scoutTaskChat] ?? 0) >= TOOL_USE_LIMIT[ToolName.scoutTaskChat]) {
    delete tools[ToolName.scoutTaskChat];
    maxSteps = 10;
  }

  // 一旦开始生成报告，就只从报告的消息开始生成了，以及无法再使用别的工具
  // 不是第一个生成成功的报告，而是报告，一旦开始生成，前面的信息目前来看是暂时没用了其实
  const firstReportIndex = coreMessages.findIndex(
    (message) =>
      // message.role === "tool" &&
      message.role === "assistant" &&
      Array.isArray(message.content) &&
      // message.content[0]?.type === "tool-result" &&
      message.content[0]?.type === "tool-call" &&
      message.content[0]?.toolName === ToolName.generateReport,
  );
  if (firstReportIndex) {
    coreMessages = coreMessages.slice(firstReportIndex);
  }
  if ((toolUseCount[ToolName.generateReport] ?? 0) >= TOOL_USE_LIMIT[ToolName.generateReport]) {
    delete tools[ToolName.generateReport];
    maxSteps = 2;
  }

  // 超出 tokens 限制以后，这时候每 chat 一次，就是一个很大的 input tokens 数量
  // 所以，不能再继续发送消息，直接返回一个特定的消息
  if (tokensConsumed >= TOKENS_COMSUME_LIMIT) {
    studyLog.error(`tokensConsumed ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}`);
    const locale = await getLocale();
    const message =
      locale === "zh-CN"
        ? "当前研究已达 Token 上限，无法继续。您可以创建一个新的研究项目继续，或通过右下角的客服聊天窗口联系我们获取帮助"
        : "You have reached the tokens limit for this study. You can create a new study project to continue, or contact us through the customer service chat window in the lower right corner for assistance.";
    return createDataStreamResponse({
      execute: async (dataStream) => {
        dataStream.write(formatDataStreamPart("start_step", { messageId: "out-of-token" }));
        dataStream.write(formatDataStreamPart("text", message));
        dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
      },
    });
  }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const system = studySystem({
    // 限制是 1M，告诉模型限制是 0.6M
    tokensStat: { used: tokensConsumed, limit: TOKENS_COMSUME_LIMIT * 0.6 },
    toolUseStat: {
      [ToolName.scoutTaskChat]: {
        used: toolUseCount[ToolName.scoutTaskChat] ?? 0,
        limit: TOOL_USE_LIMIT[ToolName.scoutTaskChat],
      },
      [ToolName.generateReport]: {
        used: toolUseCount[ToolName.generateReport] ?? 0,
        limit: TOOL_USE_LIMIT[ToolName.generateReport],
      },
    },
  });
  let streamStartTime = Date.now();
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: system,
    messages: coreMessages,
    tools: tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    maxSteps: maxSteps,
    maxTokens: maxTokens,
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
      studyLog.info({ msg: "Step finished", stepType: step.stepType, toolCalls, usage });
      if (statReport) {
        const reportedBy = "study chat";
        const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
        streamStartTime = Date.now();
        const promises = [
          statReport("duration", seconds, { reportedBy }),
          statReport("steps", toolCalls.length, { reportedBy, toolCalls }),
        ];
        if (usage.totalTokens > 0) {
          promises.push(statReport("tokens", usage.totalTokens, { reportedBy }));
        }
        await Promise.all(promises);
      }
    },
    onFinish: async () => {
      await clearBackgroundToken();
    },
    onError: async ({ error }) => {
      // 这里也包括 tool calling 里面直接 throw 的异常
      studyLog.error(`streamText onError: ${(error as Error).message}`);
      // @IMPORTANT 这很重要, 中断所有的 tool calling 里可能还在运行的 streamText
      try {
        abortController.abort();
      } catch (error) {
        studyLog.error(`Error during abort: ${(error as Error).message}`);
      }
      // 出错了以后没必要继续在后台执行了
      await clearBackgroundToken();
    },
    abortSignal: delayedAbortSignal,
  });

  backgroundChatUntilCancel({
    userId,
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    abortController,
    clearBackgroundToken,
  });

  return streamTextResult.toDataStreamResponse();
}
