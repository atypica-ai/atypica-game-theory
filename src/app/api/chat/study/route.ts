import { authOptions } from "@/lib/auth";
import openai from "@/lib/openai";
import { prisma } from "@/lib/prisma";
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
import { InputJsonValue } from "@prisma/client/runtime/library";
import { waitUntil } from "@vercel/functions";
import { generateId, Message, streamText, TextStreamPart } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

function appendChunkToStreamingMessage(
  streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> },
  chunk: TextStreamPart<any>,
) {
  if (chunk.type === "text-delta") {
    streamingMessage.content += chunk.textDelta;
    const parts = streamingMessage.parts;
    const lastPart = parts[parts.length - 1];
    if (lastPart?.type !== "text") {
      parts.push({ type: "text", text: chunk.textDelta });
    } else {
      lastPart.text += chunk.textDelta;
    }
  } else if (chunk.type === "tool-call") {
    streamingMessage.content += "";
    streamingMessage.parts.push({
      type: "tool-invocation",
      toolInvocation: {
        state: "call",
        toolName: chunk.toolName,
        args: chunk.args,
        toolCallId: chunk.toolCallId,
      },
    });
  } else if (chunk.type === "tool-result") {
    streamingMessage.content += "";
    const index = streamingMessage.parts.findIndex(
      (part) =>
        part.type === "tool-invocation" && part.toolInvocation.toolCallId === chunk.toolCallId,
    );
    if (index !== -1) {
      streamingMessage.parts[index] = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          toolName: chunk.toolName,
          args: chunk.args,
          toolCallId: chunk.toolCallId,
          result: chunk.result,
        },
      };
    }
  }
  // 其他类型的在 studychat 里遇不到，不用处理
}

const persistentMessages = (() => {
  let timeout: NodeJS.Timeout | null = null;
  return async (studyUserChatId: number, messages: Message[]) => {
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    // Set new timeout for 10 seconds
    timeout = setTimeout(async () => {
      try {
        await prisma.userChat.update({
          where: { id: studyUserChatId },
          data: { messages: messages as unknown as InputJsonValue },
        });
        console.log(`[${studyUserChatId}] Messages persisted successfully`);
      } catch (error) {
        console.log(`[${studyUserChatId}] Error persisting messages:`, error);
      }
    }, 3000); // 10 seconds debounce
  };
})();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const studyUserChatId = parseInt(payload["id"]);
  const initialMessages = payload["messages"] as Message[];

  // const abortSignal = req.signal;
  // 请求断了以后不终止，自己创建一个 controller 在 onError 里触发，或者收到用户中断的操作指令时候触发
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => {
    console.log(`[241] StudyChat request aborted`, req.url, "do nothing, background working");
    // abortController.abort();
  });
  const abortSignal = abortController.signal;

  const backgroundToken = new Date().valueOf().toString();
  const studyUserChat = await prisma.userChat.update({
    where: { id: studyUserChatId },
    data: { backgroundToken },
  });
  waitUntil(
    new Promise((resolve) => {
      async function checkBackgroundToken() {
        const userChat = await prisma.userChat.findUniqueOrThrow({
          where: { id: studyUserChatId },
          select: { backgroundToken: true },
        });
        if (userChat.backgroundToken !== backgroundToken) {
          console.log(
            `[${studyUserChatId}] StudyChat background token cleared or changed, aborting background running`,
          );
          try {
            abortController.abort();
          } catch (error) {
            console.log(`[${studyUserChatId}] Error during abort:`, error);
          }
          resolve(null);
        } else {
          setTimeout(() => checkBackgroundToken(), 1000);
        }
      }
      checkBackgroundToken();
    }),
  );
  const clearBackgroundToken = async () => {
    try {
      await prisma.userChat.update({
        where: { id: studyUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      console.log(
        `[${studyUserChatId}] Failed to clear background token`,
        (error as Error).message,
      );
    }
  };

  const streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> } = {
    id: generateId(),
    content: "",
    parts: [],
  };

  const { statReport } = initStatReporter(studyUserChatId);
  let streamStartTime = Date.now();

  const result = streamText({
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
      console.log(`[${studyUserChatId}] StudyChat onError:`, (error as Error).message);
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
        `[${studyUserChatId}] StudyChat step`,
        step.stepType,
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
    abortSignal,
  });

  waitUntil(
    new Promise(async (resolve, reject) => {
      let stop = false;
      const start = Date.now();
      const tick = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        if (elapsedSeconds > 1800) {
          // 30 mins
          console.log(`\n[${studyUserChatId}] StudyChat timeout\n`);
          stop = true;
          resolve(null);
        }
        if (stop) {
          console.log(`\n[${studyUserChatId}] StudyChat stopped\n`);
        } else {
          console.log(`\n[${studyUserChatId}] StudyChat is ongoing, ${elapsedSeconds} seconds`);
          setTimeout(() => tick(), 5000);
        }
      };
      tick();
      // consume the stream to ensure it runs to completion & triggers onFinish
      // even when the client response is aborted:
      try {
        await result.consumeStream();
        stop = true;
        resolve(null);
      } catch (error) {
        reject(error);
      }
    }),
  );

  return result.toDataStreamResponse();
}
