import { llm, providerOptions } from "@/lib/llm";
import { studySystemNoQuota } from "@/prompt";
import { requestPaymentTool, ToolName } from "@/tools";
import { CoreMessage, Message, smoothStream, streamText } from "ai";

export async function noQuotaAgentRequest({
  // studyUserChatId,
  coreMessages,
  // streamingMessage,
  // userId,
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
  const streamTextResult = streamText({
    // model: llm("o3-mini"),
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: studySystemNoQuota(),
    messages: coreMessages,
    tools: {
      [ToolName.requestPayment]: requestPaymentTool,
    },
    toolChoice: "required",
    maxSteps: 15,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    abortSignal: reqSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
