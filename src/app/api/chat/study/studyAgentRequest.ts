import { appendChunkToStreamingMessage } from "@/lib/messageUtils";
import openai from "@/lib/openai";
import { studySystem } from "@/prompt";
import { studySystemNoQuota } from "@/prompt/study";
import {
  generateReportTool,
  initStatReporter,
  interviewChatTool,
  reasoningThinkingTool,
  requestInteractionTool,
  requestPaymentTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  scoutTaskChatTool,
  ToolName,
} from "@/tools";
import { CoreMessage, Message, streamText, TextStreamPart } from "ai";
import { createAbortSignals } from "./abortSignal";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { debouncePersistentMessage } from "./persistent";
import { checkQuota } from "./quota";

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function studyAgentRequest({
  studyUserChatId,
  coreMessages,
  streamingMessage,
  userId,
  reqSignal,
}: {
  studyUserChatId: number;
  coreMessages: CoreMessage[];
  streamingMessage: Omit<Message, "role"> & {
    parts: NonNullable<Message["parts"]>;
    role: "assistant";
  };
  userId: number;
  reqSignal: AbortSignal | null;
}) {
  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const { abortController, abortSignal, delayedAbortSignal } = createAbortSignals(reqSignal);
  const { statReport } = initStatReporter(studyUserChatId);

  const hasQuota = await checkQuota({ studyUserChatId, userId, cost: 100 });

  let streamStartTime = Date.now();
  const tools = {
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, abortSignal, statReport }),
    [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool(),
    [ToolName.saveAnalyst]: saveAnalystTool({ userId, studyUserChatId }),
    [ToolName.interviewChat]: interviewChatTool({ userId, abortSignal, statReport }),
    [ToolName.generateReport]: generateReportTool({ abortSignal, statReport }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.requestPayment]: requestPaymentTool,
  };
  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: hasQuota ? studySystem() : studySystemNoQuota(),
    messages: coreMessages,
    tools,
    maxSteps: 15,
    onError: async ({ error }) => {
      // 这里也包括 tool calling 里面直接 throw 的异常
      console.log(`StudyChat [${studyUserChatId}] streamText onError:`, (error as Error).message);
      // @IMPORTANT 这很重要, 中断所有的 tool calling 里可能还在运行的 streamText
      try {
        abortController.abort();
      } catch (error) {
        console.log(`[${studyUserChatId}] Error during abort:`, error);
      }
    },
    onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof tools> }) => {
      // console.log(`[${studyUserChatId}] StudyChat onChunk:`, chunk);
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(studyUserChatId, streamingMessage, {
        immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
      });
    },
    onStepFinish: async (step) => {
      console.log("onStepFinish", step.response.messages[0].id);
      // 到了这里的 tool calling step 一定是有 result 的，所以得在上面 onChunk 里面获取 call 阶段的 tool
      console.log(
        `StudyChat [${studyUserChatId}] step [${step.stepType}]`,
        step.toolCalls.map((call) => call.toolName),
      );
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
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    abortController,
  });

  return streamTextResult.toDataStreamResponse();
}
