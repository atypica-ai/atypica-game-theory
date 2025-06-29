import "server-only";

import { ToolName } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { ChatMessageAttachment } from "@/lib/attachments/types";
import { ChatMessage } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";

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

function fixChatMessages(messages: Message[]) {
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

/**
 * AI message 上面的 experimental_attachments 会被忽略，使用 attachments
 * 重要：这是唯一会保存 ChatMessage 的地方，这一点要始终遵循，确保保存 ChatMessage 的规则一致
 */
export const persistentAIMessageToDB = async (
  userChatId: number,
  message: Message,
  attachments?: ChatMessageAttachment[], // 暂时还没地方用到，现在唯一存储 attachments 的地方，在 createStudyUserChat 里直接实现了
) => {
  const {
    id: messageId,
    role,
    content,
    parts: _parts,
    createdAt,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    experimental_attachments, // 忽略，用不到，不用保存，而且里面会有 base64 file content, 保存下来太大了
    ...extra
  } = message;
  const parts: NonNullable<Message["parts"]> = _parts?.length
    ? _parts
    : [{ type: "text", text: content }];
  const dataToPersist = {
    role,
    content,
    parts: parts as InputJsonValue,
    extra: extra as InputJsonValue,
    ...(attachments ? { attachments } : undefined),
  };
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
          createdAt, // 同时也覆盖 createdAt
          ...dataToPersist,
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
      createdAt,
      ...dataToPersist,
    },
    update: {
      ...dataToPersist,
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
    if (func) {
      await func();
    }
  };
  return {
    debouncePersistentMessage,
    immediatePersistentMessage,
  };
};

/**
 * Deprecated, use async function convertDBMessagesToAIMessages instead
 */
export function convertDBMessageToAIMessage({
  messageId: id,
  role,
  content,
  parts: _parts,
  extra: _extra,
  createdAt,
}: ChatMessage): Message {
  const parts = _parts as Message["parts"];
  const extra = _extra as Omit<Message, "id" | "role" | "content" | "parts" | "createdAt"> | null;
  const message: Message = { ...extra, id, role, content, parts, createdAt };
  return message;
}

export async function convertDBMessagesToAIMessages(dbMessages: ChatMessage[]): Promise<Message[]> {
  const aiMessages = await Promise.all(
    dbMessages.map(
      async ({
        messageId: id,
        role,
        content,
        parts: _parts,
        extra: _extra,
        attachments: _attachments,
        createdAt,
      }) => {
        const parts = _parts as Message["parts"];
        const extra = _extra
          ? (_extra as Omit<Message, "id" | "role" | "content" | "parts" | "createdAt">)
          : undefined;
        const attachments = _attachments ? (_attachments as ChatMessageAttachment[]) : undefined;
        const message: Message = { ...extra, id, role, content, parts, createdAt };
        if (attachments) {
          message["experimental_attachments"] = await Promise.all(
            attachments.map(async ({ name, objectUrl, mimeType, size }: ChatMessageAttachment) => {
              const url = await fileUrlToDataUrl({ objectUrl, mimeType });
              const extra = { objectUrl, size }; // 不管3721，都放进去，但不要依赖这个值
              return { extra, url, name, contentType: mimeType };
            }),
          );
        }
        return message;
      },
    ),
  );
  return aiMessages;
}

/*
 * 接收客户端发送的消息，可能是 user 或者 assistant 的
 * 保存到数据库，取出完整的消息列表
 * 转换成 streamText 的格式
 */
export async function prepareMessagesForStreaming(
  userChatId: number,
  {
    checkpointId,
  }: {
    checkpointId?: number; // 给 LLM 的消息从 id > checkpointId 开始取，这里不是 messageId 而是 ChatMessage 的数据库 id，并且 id 是递增的
  } = {},
) {
  const dbMessages = await prisma.chatMessage.findMany({
    where: checkpointId
      ? {
          userChatId,
          id: {
            gt: checkpointId,
          },
        }
      : { userChatId },
    orderBy: { id: "asc" },
  });
  // 使用 fix 之前的统计数据，因为 fix 会把没完成的 tool calls 变成完成
  const toolUseCount = dbMessages.reduce(
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
  const aiMessages = fixChatMessages(await convertDBMessagesToAIMessages(dbMessages)); // 传给 LLM 的时候需要修复
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
  };
}

export { CONTINUE_ASSISTANT_STEPS } from "./messageUtilsClient";
