import { openai } from "@/lib/llm";
import { studySystemNoQuota } from "@/prompt";
import { requestInteractionTool, requestPaymentTool, ToolName } from "@/tools";
import { CoreMessage, Message, streamText } from "ai";

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
  const tools = {
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.requestPayment]: requestPaymentTool,
  };
  const streamTextResult = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: studySystemNoQuota(),
    messages: coreMessages,
    tools,
    maxSteps: 15,
    abortSignal: reqSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
