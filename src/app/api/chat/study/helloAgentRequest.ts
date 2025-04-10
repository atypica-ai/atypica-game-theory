import openai from "@/lib/openai";
import { fixChatMessages } from "@/lib/utils";
import { studySystemEnterpriseSale } from "@/prompt/study";
import { initStatReporter, thanksTool, ToolName } from "@/tools";
import { generateId, Message, streamText } from "ai";
import { appendChunkToStreamingMessage, persistentMessages } from "./messageUtils";
import { checkQuota } from "./quota";

export async function helloAgentRequest({
  studyUserChatId,
  initialMessages,
  userId,
  reqSignal,
}: {
  studyUserChatId: number;
  initialMessages: Message[];
  userId: number;
  reqSignal: AbortSignal;
}) {
  const { statReport } = initStatReporter(studyUserChatId);

  // 扣除 0 积分
  await checkQuota({ studyUserChatId, userId, cost: 0 });

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
      // [ToolName.requestInteraction]: requestInteractionTool,
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
    abortSignal: reqSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
