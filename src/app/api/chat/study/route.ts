import { authOptions } from "@/lib/auth";
import openai from "@/lib/openai";
import { fixChatMessages } from "@/lib/utils";
import { studySystem } from "@/prompt";
import { studySystemEnterpriseSale, studySystemNoQuota } from "@/prompt/study";
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
  scoutTaskCreateTool,
  thanksTool,
  ToolName,
} from "@/tools";
import { generateId, Message, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { createAbortSignals } from "./abortSignal";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { appendChunkToStreamingMessage, persistentMessages } from "./messageUtils";
import { checkQuota } from "./quota";

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function studyAgentRequest(req: Request, payload: any, userId: number) {
  const studyUserChatId = parseInt(payload["id"]);
  const initialMessages = payload["messages"] as Message[];
  if (!studyUserChatId || !initialMessages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const { abortController, abortSignal, delayedAbortSignal } = createAbortSignals(req.signal);
  const { statReport } = initStatReporter(studyUserChatId);

  const hasQuota = await checkQuota({ studyUserChatId, userId });

  const streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> } = {
    id: generateId(),
    content: "",
    parts: [],
  };

  let streamStartTime = Date.now();

  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: hasQuota ? studySystem() : studySystemNoQuota(),
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
      [ToolName.requestPayment]: requestPaymentTool,
    },
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
    onChunk: async ({ chunk }) => {
      // console.log(`[${studyUserChatId}] StudyChat onChunk:`, chunk);
      appendChunkToStreamingMessage(streamingMessage, chunk);
      const messages: Message[] = [...initialMessages, { role: "assistant", ...streamingMessage }];
      persistentMessages(studyUserChatId, messages, {
        immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
      });
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

  backgroundChatUntilCancel({
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    abortController,
  });

  return streamTextResult.toDataStreamResponse();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function helloAgentRequest(req: Request, payload: any) {
  const studyUserChatId = parseInt(payload["id"]);
  const initialMessages = payload["messages"] as Message[];
  if (!studyUserChatId || !initialMessages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { statReport } = initStatReporter(studyUserChatId);

  const streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> } = {
    id: generateId(),
    content: "",
    parts: [],
  };

  let streamStartTime = Date.now();

  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: studySystemEnterpriseSale(),
    messages: fixChatMessages(initialMessages, { removePendingTool: true }), // 传给 LLM 的时候需要修复
    tools: {
      // [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal: req.signal, statReport }),
      [ToolName.requestInteraction]: requestInteractionTool,
      [ToolName.thanks]: thanksTool,
    },
    maxSteps: 5,
    onChunk: async ({ chunk }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      const messages: Message[] = [...initialMessages, { role: "assistant", ...streamingMessage }];
      persistentMessages(studyUserChatId, messages, {
        immediate: chunk.type === "tool-call", // || chunk.type === "tool-result",
      });
    },
    onStepFinish: async (step) => {
      if (step.usage.totalTokens > 0) {
        await Promise.all([
          statReport("tokens", step.usage.totalTokens, { reportedBy: "hello chat" }),
        ]);
      }
    },
    onFinish: async (event) => {
      const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
      streamStartTime = Date.now();
      await Promise.all([
        statReport("duration", seconds, { reportedBy: "hello chat" }),
        statReport("steps", event.steps.length, { reportedBy: "hello chat" }),
      ]);
    },
    abortSignal: req.signal,
  });

  return streamTextResult.toDataStreamResponse();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json();
  const hello = payload["hello"] === "1";
  if (hello) {
    return await helloAgentRequest(req, payload);
  } else {
    return await studyAgentRequest(req, payload, session.user.id);
  }
}
