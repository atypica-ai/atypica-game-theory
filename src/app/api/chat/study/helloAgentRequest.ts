import { appendChunkToStreamingMessage } from "@/lib/messageUtils";
import openai from "@/lib/openai";
import { studySystemEnterpriseSale } from "@/prompt/study";
import { initStatReporter, thanksTool, ToolName } from "@/tools";
import { CoreMessage, Message, streamText, TextStreamPart } from "ai";
import { debouncePersistentMessage } from "./persistent";

export async function helloAgentRequest({
  studyUserChatId,
  coreMessages,
  streamingMessage,
  reqSignal,
}: {
  studyUserChatId: number;
  coreMessages: CoreMessage[];
  streamingMessage: Omit<Message, "role"> & {
    parts: NonNullable<Message["parts"]>;
    role: "assistant";
  };
  userId: number;
  reqSignal: AbortSignal;
}) {
  const { statReport } = initStatReporter(studyUserChatId);

  let streamStartTime = Date.now();
  const tools = {
    // [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal: req.signal, statReport }),
    // [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.thanks]: thanksTool,
  };
  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: studySystemEnterpriseSale(),
    messages: coreMessages, // 传给 LLM 的时候需要修复
    tools,
    maxSteps: 5,
    onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof tools> }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(studyUserChatId, streamingMessage, {
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
