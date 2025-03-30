import { prisma } from "@/lib/prisma";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Message, TextStreamPart } from "ai";

export function appendChunkToStreamingMessage(
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

export const persistentMessages = (() => {
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
