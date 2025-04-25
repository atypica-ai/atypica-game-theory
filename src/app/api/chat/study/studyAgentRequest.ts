import { llm, providerOptions } from "@/lib/llm";
import { appendChunkToStreamingMessage, createDebouncePersistentMessage } from "@/lib/messageUtils";
import { studySystem } from "@/prompt";
import {
  generateReportTool,
  initStatReporter,
  interviewChatTool,
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  scoutTaskChatTool,
  ToolName,
} from "@/tools";
import { CoreMessage, Message, streamText, TextStreamPart } from "ai";
import { Logger } from "pino";
import { createAbortSignals } from "./abortSignal";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function studyAgentRequest({
  studyUserChatId,
  coreMessages,
  streamingMessage,
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
  let streamStartTime = Date.now();
  const tools = {
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, abortSignal, statReport, studyLog }),
    [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool(),
    [ToolName.saveAnalyst]: saveAnalystTool({ userId, studyUserChatId }),
    [ToolName.interviewChat]: interviewChatTool({ userId, abortSignal, statReport, studyLog }),
    [ToolName.generateReport]: generateReportTool({ abortSignal, statReport, studyLog }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
    [ToolName.requestInteraction]: requestInteractionTool,
  };
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: studySystem(),
    messages: coreMessages,
    tools,
    maxSteps: 15,
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
      // 注意，stepFinish 一定要保存，并且 immediate:true，前面等待中的 chunk persistent 会被去掉，没影响
      // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
      // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
      // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整
      // 到了这里的 tool calling step 一定是有 result 的，所以得在上面 onChunk 里面获取 call 阶段的 tool
      studyLog.info({
        msg: "Step finished",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
      if (step.usage.totalTokens > 0) {
        await Promise.all([
          statReport("tokens", step.usage.totalTokens, { reportedBy: "study chat" }),
        ]);
      }
    },
    onFinish: async (event) => {
      await clearBackgroundToken();
      const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
      streamStartTime = Date.now();
      await Promise.all([
        statReport("duration", seconds, { reportedBy: "study chat" }),
        statReport("steps", event.steps.length, { reportedBy: "study chat" }),
      ]);
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
