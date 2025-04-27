import { prisma } from "@/lib/prisma";
import { ToolName } from "@/tools";
import { ChatMessage } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import {
  convertToCoreMessages,
  generateId,
  Message,
  StepResult,
  TextStreamPart,
  ToolInvocation,
  ToolSet,
} from "ai";
import { Logger } from "pino";

export function fixChatMessages(messages: Message[]) {
  let fixed = messages.map((message) => {
    if (!message.parts) {
      return message;
    }
    // 给 pending 的 tool 都标记下
    let parts = message.parts.map((part) => {
      if (part.type !== "tool-invocation" || part.toolInvocation.state == "result") {
        return part;
      }
      // 如果不是 result，一定是执行了一半挂了，要告诉大模型
      return {
        ...part,
        toolInvocation: {
          ...part.toolInvocation,
          state: "result",
          result: {
            error: "Tool execution interrupted due to unknown reasons",
            plainText: "Tool execution interrupted due to unknown reasons",
          },
        } as ToolInvocation,
      };
    });
    // 去除空的 text part
    parts = parts.filter((part) => {
      if (part.type === "text" && !part.text.trim()) {
        return false;
      }
      return true;
    });
    return { ...message, parts };
  });

  // 删除所有空的消息，llm 会报错
  fixed = fixed.filter((message) => {
    if (!message.parts?.length && !message.content.trim()) {
      return false;
    }
    return true;
  });

  // if (
  //   fixed.length > 1 &&
  //   fixed[fixed.length - 2].role === "user" &&
  //   fixed[fixed.length - 1].role === "user"
  // ) {
  //   // 如果最后 2 条都是 user，一定是之前聊了一半挂了，丢掉最后一条
  //   fixed = fixed.slice(0, -1);
  // }

  // if (
  //   fixed.length > 1 &&
  //   fixed[fixed.length - 1].role === "assistant" &&
  //   !fixed[fixed.length - 1].parts?.length &&
  //   !fixed[fixed.length - 1].content.trim()
  // ) {
  //   // Bedrock 不支持最后一条空的 assistant 消息
  //   fixed = fixed.slice(0, -1);
  // }

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
  const { id: messageId, role, content, parts: _parts, createdAt, ...extra } = message;
  const parts: NonNullable<Message["parts"]> = _parts?.length
    ? _parts
    : [{ type: "text", text: content }];
  if (role === "user") {
    // 如果最后一条消息是 user，则覆盖
    const lastUserMessage = await prisma.chatMessage.findFirst({
      where: { userChatId },
      orderBy: { id: "desc" },
    });
    if (lastUserMessage?.role === "user") {
      await prisma.chatMessage.update({
        where: { id: lastUserMessage.id },
        data: {
          messageId,
          content,
          parts: parts as InputJsonValue,
          extra: extra as InputJsonValue,
          createdAt,
        },
      });
      // 结束，不再继续
      return;
    }
  }
  await prisma.chatMessage.upsert({
    where: { userChatId, messageId },
    create: {
      userChatId,
      messageId,
      role,
      content,
      parts: parts as InputJsonValue,
      extra: extra as InputJsonValue,
      createdAt,
    },
    update: {
      role,
      content,
      parts: parts as InputJsonValue,
      extra: extra as InputJsonValue,
    },
  });
};

export const createDebouncePersistentMessage = (
  userChatId: number,
  mills: number,
  logger: Logger,
) => {
  let timeout: NodeJS.Timeout | null = null;
  let func: () => Promise<void>;
  const debouncePersistentMessage = async (
    message: Message,
    { immediate }: { immediate?: boolean } = {},
  ) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    func = async () => {
      try {
        await persistentAIMessageToDB(userChatId, message);
        logger.info(`Message ${message.id} persisted successfully`);
      } catch (error) {
        logger.info(`Error persisting message ${message.id}: ${(error as Error).message}`);
      }
    };
    timeout = setTimeout(func, immediate ? 0 : mills);
  };
  const immediatePersistentMessage = async () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    await func();
  };
  return {
    debouncePersistentMessage,
    immediatePersistentMessage,
  };
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

/*
 * 接收客户端发送的消息，可能是 user 或者 assistant 的
 * 保存到数据库，取出完整的消息列表
 * 转换成 streamText 的格式
 */
export async function prepareNewMessageForStreaming(userChatId: number, newMessage: Message) {
  // 首先要把新提交的消息保存
  // 如果是 user message，会新建一条，
  // 如果是 assistant message，一般是 addToolResult 的结果，这时候 messageId 已存在，则更新 tool 的交互结果
  await persistentAIMessageToDB(userChatId, newMessage);
  // persist 了以后，取一下最新的消息列表，包含了最新的 new message, user 或者 assistant 的
  const messages = await prisma.chatMessage.findMany({
    where: { userChatId },
    orderBy: { id: "asc" },
  });
  // 使用 fix 之前的统计数据，因为 fix 会把没完成的 tool calls 变成完成
  const toolUseCount = messages.reduce(
    (_count, message) => {
      const count = { ..._count };
      ((message.parts ?? []) as NonNullable<Message["parts"]>).forEach((part) => {
        if (part.type === "tool-invocation" && part.toolInvocation.state === "result") {
          const toolName = part.toolInvocation.toolName as ToolName;
          count[toolName] = (count[toolName] || 0) + 1;
        }
      });
      return count;
    },
    {} as Partial<Record<ToolName, number>>,
  );
  const aiMessages = fixChatMessages(messages.map(convertDBMessageToAIMessage)); // 传给 LLM 的时候需要修复
  const tokensConsumed =
    (
      await prisma.chatStatistics.aggregate({
        where: { userChatId, dimension: "tokens" },
        _sum: { value: true },
      })
    )._sum.value ?? 0;
  let streamingMessage: Omit<Message, "role"> & {
    parts: NonNullable<Message["parts"]>;
    role: "assistant";
  } = {
    id: generateId(),
    content: "",
    parts: [],
    role: "assistant",
  };
  if (aiMessages[aiMessages.length - 1]?.role === "assistant") {
    const lastMessage = aiMessages[aiMessages.length - 1];
    streamingMessage = {
      ...lastMessage,
      parts: lastMessage.parts ?? [],
      role: "assistant",
    };
  }
  // convertToCoreMessages 会把 role 全都是 assistant 并且包含 toolInvocation 的 part 转成
  // 一个 role: assistant 的 tool calling 内容 + 一个 role: tool 的 toll result 内容
  // 这样 LLM 才能理解，否则直接把 aiMessages 给 LLM 它会认为 tool 没执行 ...
  // 不知道之前没有一条条保存信息的时候，vercel ai sdk 是哪个阶段处理的，现在一定要人工转一次
  const coreMessages = convertToCoreMessages(aiMessages);
  return {
    coreMessages,
    streamingMessage,
    toolUseCount,
    tokensConsumed,
  };
}
