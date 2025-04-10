import { prisma } from "@/lib/prisma";
import { ChatMessage } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { generateId, Message, StepResult, TextStreamPart, ToolInvocation, ToolSet } from "ai";

export function fixChatMessages(
  messages: Message[],
  options: {
    removePendingTool?: boolean;
  } = {},
) {
  let fixed = messages.map((message) => {
    if (!message.parts) {
      return message;
    }
    const parts = message.parts.filter((part) => {
      if (part.type === "tool-invocation") {
        // 如果不是 result，一定是执行了一半挂了，丢弃
        if (options.removePendingTool) {
          return part.toolInvocation.state === "result";
        } else {
          return true;
        }
      } else if (part.type === "text") {
        return part.text.trim();
      } else {
        return true;
      }
    });
    return { ...message, parts };
  });

  if (
    fixed.length > 1 &&
    fixed[fixed.length - 2].role === "user" &&
    fixed[fixed.length - 1].role === "user"
  ) {
    // 如果最后 2 条都是 user，一定是之前聊了一半挂了，丢掉最后一条
    fixed = fixed.slice(0, -1);
  }

  if (
    fixed.length > 1 &&
    fixed[fixed.length - 1].role === "assistant" &&
    !fixed[fixed.length - 1].parts?.length &&
    !fixed[fixed.length - 1].content.trim()
  ) {
    // Bedrock 不支持最后一条空的 assistant 消息
    fixed = fixed.slice(0, -1);
  }

  return fixed;
}

export function convertStepsToAIMessage<T extends ToolSet>(
  steps: StepResult<T>[],
): Omit<Message, "role"> {
  const parts: Message["parts"] = [];
  const contents = [];
  for (const step of steps) {
    // 这三步其实是可以合并的
    if (step.stepType === "initial") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    } else if (step.stepType === "continue") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    } else if (step.stepType === "tool-result") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    }
    // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
    // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
    for (const toolCall of step.toolCalls) {
      let toolInvocation: ToolInvocation = {
        state: "call",
        toolName: toolCall.toolName,
        args: toolCall.args,
        toolCallId: toolCall.toolCallId,
      };
      const toolResult = step.toolResults.find((r) => r.toolCallId === toolInvocation.toolCallId);
      if (toolResult) {
        toolInvocation = {
          state: "result",
          toolName: toolResult.toolName,
          args: toolResult.args,
          toolCallId: toolCall.toolCallId,
          result: toolResult.result,
        };
      }
      parts.push({
        type: "tool-invocation",
        toolInvocation,
      });
    }
  }
  return {
    id: generateId(),
    content: contents.join("\n"),
    parts,
  };
}

export function appendStepToStreamingMessage<T extends ToolSet>(
  streamingMessage: Omit<Message, "role">,
  step: StepResult<T>,
) {
  const parts: Message["parts"] = streamingMessage.parts ?? [];
  const contents = [streamingMessage.content ?? ""];
  // 这三步其实是可以合并的
  if (step.stepType === "initial") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  } else if (step.stepType === "continue") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  } else if (step.stepType === "tool-result") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  }
  // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
  // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
  for (const toolCall of step.toolCalls) {
    let toolInvocation: ToolInvocation = {
      state: "call",
      toolName: toolCall.toolName,
      args: toolCall.args,
      toolCallId: toolCall.toolCallId,
    };
    const toolResult = step.toolResults.find((r) => r.toolCallId === toolInvocation.toolCallId);
    if (toolResult) {
      toolInvocation = {
        state: "result",
        toolName: toolResult.toolName,
        args: toolResult.args,
        toolCallId: toolCall.toolCallId,
        result: toolResult.result,
      };
    }
    parts.push({
      type: "tool-invocation",
      toolInvocation,
    });
  }
  streamingMessage.content = contents.join("\n");
  streamingMessage.parts = parts;
}

export function appendChunkToStreamingMessage<T extends ToolSet>(
  streamingMessage: Omit<Message, "role"> & { parts: NonNullable<Message["parts"]> },
  chunk: TextStreamPart<T>,
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

export const persistentAIMessageToDB = async (userChatId: number, message: Message) => {
  const { id: messageId, role, content, parts, createdAt, ...extra } = message;
  await prisma.chatMessage.upsert({
    where: { userChatId, messageId },
    create: {
      userChatId,
      messageId,
      role,
      content,
      parts: (parts ?? []) as InputJsonValue,
      extra: extra as InputJsonValue,
      createdAt,
    },
    update: {
      role,
      content,
      parts: (parts ?? []) as InputJsonValue,
      extra: extra as InputJsonValue,
    },
  });
};

export function convertDBMessageToAIMessage({
  messageId: id,
  role,
  content,
  parts: _parts,
  createdAt,
}: ChatMessage): Message {
  const parts = _parts as Message["parts"];
  const message: Message = { id, role, content, parts, createdAt };
  return message;
}
