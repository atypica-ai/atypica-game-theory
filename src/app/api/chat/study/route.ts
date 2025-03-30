import { authOptions } from "@/lib/auth";
import openai from "@/lib/openai";
import { fixChatMessages } from "@/lib/utils";
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
  scoutTaskCreateTool,
  ToolName,
} from "@/tools";
import { generateId, Message, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { backgroundChatUntilCancel } from "./background";
import { appendChunkToStreamingMessage, persistentMessages } from "./messageUtils";

const createAbortSignals = (requestSignal: AbortSignal) => {
  // const abortSignal = req.signal;
  // 请求断了以后不终止，自己创建一个 controller 在 onError 里触发，或者收到用户中断的操作指令时候触发
  const abortController = new AbortController();
  requestSignal.addEventListener("abort", () => {
    console.log(`[241] StudyChat request aborted, do nothing, background working`);
    // abortController.abort();
  });
  const abortSignal = abortController.signal;
  const delayedAbortSignal = (() => {
    // 给 StudyChat 的 streamText 用，先等其他的请求都 abort 最后再 abort StudyChat
    // 否则 StudyChat 提前中断会取消它后续调用的所有 promise，导致他们自己在调用 abortController.abort() 方法时失败
    const delayedAbortController = new AbortController();
    abortSignal.addEventListener("abort", () => {
      setTimeout(() => delayedAbortController.abort(), 1000);
    });
    return delayedAbortController.signal;
  })();

  return {
    abortController,
    abortSignal,
    delayedAbortSignal,
  };
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const studyUserChatId = parseInt(payload["id"]);
  const initialMessages = payload["messages"] as Message[];

  const { abortController, abortSignal, delayedAbortSignal } = createAbortSignals(req.signal);

  const streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> } = {
    id: generateId(),
    content: "",
    parts: [],
  };

  const { statReport } = initStatReporter(studyUserChatId);
  let streamStartTime = Date.now();

  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: studySystem(),
    messages: fixChatMessages(initialMessages, { removePendingTool: true }), // 传给 LLM 的时候需要修复
    tools: {
      [ToolName.scoutTaskCreate]: scoutTaskCreateTool(userId),
      [ToolName.scoutTaskChat]: scoutTaskChatTool({ studyUserChatId, abortSignal, statReport }),
      [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool(),
      [ToolName.saveAnalyst]: saveAnalystTool(userId, studyUserChatId),
      [ToolName.interviewChat]: interviewChatTool({ abortSignal, statReport }),
      [ToolName.generateReport]: generateReportTool({ abortSignal, statReport }),
      [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
      [ToolName.requestInteraction]: requestInteractionTool,
    },
    maxSteps: 3,
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
    onChunk: async ({ chunk }) => {
      // console.log(`[${studyUserChatId}] StudyChat onChunk:`, chunk);
      appendChunkToStreamingMessage(streamingMessage, chunk);
      const messages: Message[] = [...initialMessages, { role: "assistant", ...streamingMessage }];
      persistentMessages(studyUserChatId, messages);
    },
    onStepFinish: async (step) => {
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

  const { clearBackgroundToken } = backgroundChatUntilCancel({
    streamTextResult,
    abortController,
    studyUserChatId,
  });

  return streamTextResult.toDataStreamResponse();
}
