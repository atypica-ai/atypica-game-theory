import { ToolName } from "@/ai/tools/types";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function noQuotaAgentRequest(
  {
    // userChat: { id: studyUserChatId },
    // coreMessages,
    // streamingMessage,
    // userId,
    // reqSignal,
  }: {
    userChat: {
      id: number;
    };
    userId: number;
    reqSignal: AbortSignal;
  },
) {
  // const streamTextResult = streamText({
  //   // model: llm("o3-mini"),
  //   model: llm("claude-3-7-sonnet"),
  //   providerOptions: providerOptions,
  //   system: studySystemNoQuota(),
  //   messages: coreMessages,
  //   tools: {
  //     [ToolName.requestPayment]: requestPaymentTool,
  //   },
  //   toolChoice: "required",
  //   maxSteps: 15,
  //   experimental_transform: smoothStream({
  //     delayInMs: 30,
  //     chunking: /[\u4E00-\u9FFF]|\S+\s+/,
  //   }),
  //   abortSignal: reqSignal,
  // });
  // return streamTextResult.toDataStreamResponse();

  // return createUIMessageStreamResponse({
  //   execute: async (dataStream) => {
  //     dataStream.write(formatDataStreamPart("start_step", { messageId: "tokens-not-enough" }));
  //     dataStream.write(
  //       formatDataStreamPart("tool_call", {
  //         toolCallId: "request-payment",
  //         toolName: ToolName.requestPayment,
  //         args: {},
  //       }),
  //     );
  //     dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
  //   },
  // });
  const toolCallId = "request-payment";
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "tool-input-start", toolCallId, toolName: ToolName.requestPayment });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: ToolName.requestPayment,
        input: {},
      });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
