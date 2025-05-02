import { llm, providerOptions } from "@/lib/llm";
import { appendChunkToStreamingMessage, createDebouncePersistentMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { studySystem } from "@/prompt";
import {
  buildPersonaTool,
  generateReportTool,
  handleToolCallError,
  initStatReporter,
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
  Message,
  smoothStream,
  StepResult,
  streamText,
  TextStreamPart,
  ToolChoice,
} from "ai";
import { Logger } from "pino";
import { createAbortSignals } from "./abortSignal";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";

const MAX_STEPS_EACH_ROUND = 15; // streamText 默认 15 步
const TOOL_USE_LIMIT = {
  [ToolName.scoutTaskChat]: 2,
  [ToolName.generateReport]: 2,
};
const TOKENS_COMSUME_LIMIT = 1_500_000;

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
  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const { abortController, abortSignal, delayedAbortSignal } = createAbortSignals(reqSignal);
  const { statReport } = initStatReporter({ userId, studyUserChatId, studyLog });
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
  let streamStartTime = Date.now();
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
  let tools: Partial<typeof allTools> = allTools;
  let toolChoice: ToolChoice<typeof allTools> = "auto";
  let maxSteps = MAX_STEPS_EACH_ROUND;
  let maxTokens: number | undefined;
  if ((toolUseCount[ToolName.scoutTaskChat] ?? 0) >= TOOL_USE_LIMIT[ToolName.scoutTaskChat]) {
    delete tools[ToolName.scoutTaskChat];
    maxSteps = 10;
  }
  if ((toolUseCount[ToolName.generateReport] ?? 0) >= TOOL_USE_LIMIT[ToolName.generateReport]) {
    delete tools[ToolName.generateReport];
    maxSteps = 2;
  }
  if (tokensConsumed >= TOKENS_COMSUME_LIMIT) {
    // 超出 tokens 限制以后，无法使用工具，每次回复不超过 1000 tokens
    // toolChoice = "none"; // claude 不支持 tool_choise = none, 所以只能清空 tools
    toolChoice = "auto";
    tools = {
      [ToolName.toolCallError]: toolCallError,
    };
    maxTokens = 1000;
    maxSteps = 1;
    studyLog.error(`tokensConsumed ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}`);
  }
  const system = studySystem({
    // 限制是 1.5M，告诉模型限制是 0.9M
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
