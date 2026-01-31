import "server-only";

import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { fileUrlToDataUrl } from "@/lib/attachments/lib";
import { rootLogger } from "@/lib/logging";
import { ChatMessage, ChatMessageAttachment, ChatMessagePart } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { InputJsonValue, ITXClientDenyList } from "@prisma/client/runtime/client";
import {
  convertToModelMessages,
  DynamicToolUIPart,
  generateId,
  getToolName,
  isToolOrDynamicToolUIPart,
  isToolUIPart,
  ModelMessage,
  StepResult,
  TextStreamPart,
  ToolSet,
  ToolUIPart,
  UIMessage,
} from "ai";
import { Logger } from "pino";
import { convertToV5MessagePart } from "./v4";

// 事实上，bedrock 虽然支持很多文件格式，但 gpt 和 gemini 只支持 pdf，所以这样 fix 也没用，只能限制上传的文件类型
// https://github.com/vercel/ai/blob/2669f00b8e9acf8352bd07d930fbd181e5219500/packages/amazon-bedrock/src/convert-to-bedrock-chat-messages.ts#L114
// function mimeTypeToAISDKContentType(mimeType: string): string {
//   const convert: Record<string, string> = {
//     "image/svg+xml": "image/svg",
//     "application/msword": "application/doc",
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "application/docx",
//     "application/vnd.ms-excel": "application/xls",
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/xlsx",
//     "application/vnd.ms-powerpoint": "application/ppt",
//     "application/vnd.openxmlformats-officedocument.presentationml.presentation": "application/pptx",
//     "text/plain": "application/txt",
//   };
//   return convert[mimeType] || mimeType;
// }

export function convertStepsToAIMessage<T extends ToolSet>(
  steps: StepResult<T>[],
): Omit<UIMessage, "role"> {
  const parts: UIMessage["parts"] = [];
  // const contents = [];
  for (const step of steps) {
    const stepText = step.text.trim() || (step.toolResults.length > 0 ? "[tool-result]" : "[text]"); // 确保 content 一定有内容
    // contents.push(stepText);
    parts.push({ type: "text", text: stepText });
    // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
    // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
    for (const toolCall of step.toolCalls) {
      let toolPart: ToolUIPart = {
        type: `tool-${toolCall.toolName}`,
        state: "input-available",
        input: toolCall.input,
        toolCallId: toolCall.toolCallId,
      };
      const toolResult = step.toolResults.find((r) => r.toolCallId === toolCall.toolCallId);
      if (toolResult) {
        toolPart = {
          type: `tool-${toolResult.toolName}`,
          state: "output-available",
          input: toolResult.input,
          toolCallId: toolCall.toolCallId,
          output: toolResult.output,
        };
      }
      parts.push(toolPart);
    }
  }
  return {
    id: generateId(),
    // content: contents.join("\n"),
    parts,
  };
}

export function appendStepToStreamingMessage<T extends ToolSet>(
  streamingMessage: Omit<UIMessage, "role">,
  step: StepResult<T>,
) {
  const parts = streamingMessage.parts ?? [];

  for (const content of step.content) {
    if (content.type === "reasoning") {
      parts.push({
        type: content.type,
        text: content.text,
        // 格外要注意，claude 模型的 extended thinking 有 signature，这个一定要带回去，不然无法被识别为是一个 reasoning block
        providerMetadata: content.providerMetadata,
      });
    } else if (content.type === "text") {
      parts.push({
        type: content.type,
        text: content.text,
        providerMetadata: content.providerMetadata,
      });
    } else if (content.type === "source") {
      if (content.sourceType === "url") {
        parts.push({
          type: "source-url",
          sourceId: content.id,
          url: content.url,
          title: content.title,
          providerMetadata: content.providerMetadata,
        });
      } else if (content.sourceType === "document") {
        parts.push({
          type: "source-document",
          sourceId: content.id,
          filename: content.filename,
          title: content.title,
          mediaType: content.mediaType,
          providerMetadata: content.providerMetadata,
        });
      }
    } else if (content.type === "tool-call") {
      // tool part 不需要 providerMetadata
      let toolPart: ToolUIPart | DynamicToolUIPart;
      if (content.dynamic) {
        toolPart = {
          type: "dynamic-tool",
          toolName: content.toolName,
          state: "input-available",
          input: content.input,
          toolCallId: content.toolCallId,
        };
      } else {
        toolPart = {
          type: `tool-${content.toolName}`,
          state: "input-available",
          input: content.input,
          toolCallId: content.toolCallId,
        };
      }
      parts.push(toolPart);
    } else if (content.type === "tool-error") {
      const toolPartIndex = parts.findIndex(
        (part) => isToolOrDynamicToolUIPart(part) && part.toolCallId === content.toolCallId,
      );
      if (toolPartIndex) {
        parts[toolPartIndex] = {
          ...parts[toolPartIndex],
          state: "output-error",
          errorText: content.error instanceof Error ? content.error.message : `${content.error}`,
        } as ToolUIPart | DynamicToolUIPart;
      }
    } else if (content.type === "tool-result") {
      const toolPartIndex = parts.findIndex(
        (part) => isToolOrDynamicToolUIPart(part) && part.toolCallId === content.toolCallId,
      );
      if (toolPartIndex) {
        parts[toolPartIndex] = {
          ...parts[toolPartIndex],
          state: "output-available",
          output: content.output,
        } as ToolUIPart | DynamicToolUIPart;
      }
    } else {
      // 目前暂时不支持
      // content.type === "file"
      rootLogger.error(
        `appendStepToStreamingMessage received unsupported content type: ${content.type}`,
      );
    }
  }

  streamingMessage.parts = parts;

  // if (step.reasoningText) {
  //   parts.push({ type: "reasoning", text: step.reasoningText });
  // }
  // const stepText = step.text.trim() || (step.toolResults.length > 0 ? "[tool-result]" : "[text]"); // 确保 content 一定有内容
  // // contents.push(stepText);
  // parts.push({ type: "text", text: stepText });
  // // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
  // // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
  // for (const toolCall of step.toolCalls) {
  //   let toolPart: ToolUIPart | DynamicToolUIPart;
  //   if (toolCall.dynamic) {
  //     toolPart = {
  //       type: "dynamic-tool",
  //       toolName: toolCall.toolName,
  //       state: "input-available",
  //       input: toolCall.input,
  //       toolCallId: toolCall.toolCallId,
  //     };
  //   } else {
  //     toolPart = {
  //       type: `tool-${toolCall.toolName}`,
  //       state: "input-available",
  //       input: toolCall.input,
  //       toolCallId: toolCall.toolCallId,
  //     };
  //   }
  //   const toolResult = step.toolResults.find((r) => r.toolCallId === toolCall.toolCallId);
  //   if (toolResult) {
  //     toolPart = {
  //       ...toolPart,
  //       state: "output-available",
  //       input: toolResult.input,
  //       toolCallId: toolCall.toolCallId,
  //       output: toolResult.output,
  //     };
  //   }
  //   parts.push(toolPart);
  // }
  // //streamingMessage.content = contents.join("\n").trimStart();
  // streamingMessage.parts = parts;
}

export function appendChunkToStreamingMessage<T extends ToolSet>(
  streamingMessage: Omit<UIMessage, "role"> & { parts: UIMessage["parts"] },
  chunk: TextStreamPart<T>,
) {
  if (chunk.type === "text-delta") {
    // see https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#stream-protocol-single-chunks--startdeltaend-pattern
    // streamingMessage.content += chunk.textDelta;
    const parts = streamingMessage.parts;
    const lastPart = parts[parts.length - 1];
    if (lastPart?.type !== "text") {
      parts.push({ type: "text", text: chunk.text });
    } else {
      lastPart.text += chunk.text;
      lastPart.providerMetadata = chunk.providerMetadata;
    }
  } else if (chunk.type === "reasoning-delta") {
    const parts = streamingMessage.parts;
    const lastPart = parts[parts.length - 1];
    if (lastPart?.type !== "reasoning") {
      parts.push({ type: "reasoning", text: chunk.text });
    } else {
      lastPart.text += chunk.text;
      lastPart.providerMetadata = chunk.providerMetadata; // 格外要注意，claude 模型的 extended thinking 有 signature，这个一定要带回去，不然无法被识别为是一个 reasoning block
    }
  } else if (chunk.type === "tool-call") {
    // see https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#tool-input-streaming
    // streamingMessage.content += "";
    streamingMessage.parts.push({
      ...(chunk.dynamic
        ? { type: "dynamic-tool", toolName: chunk.toolName }
        : { type: `tool-${chunk.toolName}` }),
      toolCallId: chunk.toolCallId,
      input: chunk.input,
      state: "input-available",
      // tool part 不需要 providerMetadata
    });
  } else if (chunk.type === "tool-result") {
    // streamingMessage.content += "";
    const index = streamingMessage.parts.findIndex(
      // 通过 toolCallId 字段寻找，兼容 v4 和 v5
      (part) => "toolCallId" in part && part.toolCallId === chunk.toolCallId,
    );
    if (index !== -1) {
      streamingMessage.parts[index] = {
        ...(chunk.dynamic
          ? { type: "dynamic-tool", toolName: chunk.toolName }
          : { type: `tool-${chunk.toolName}` }),
        toolCallId: chunk.toolCallId,
        input: chunk.input,
        state: "output-available",
        output: chunk.output,
      };
    }
  } else if (chunk.type === "tool-error") {
    const index = streamingMessage.parts.findIndex(
      // 通过 toolCallId 字段寻找，兼容 v4 和 v5
      (part) => "toolCallId" in part && part.toolCallId === chunk.toolCallId,
    );
    if (index !== -1) {
      streamingMessage.parts[index] = {
        ...(chunk.dynamic
          ? { type: "dynamic-tool", toolName: chunk.toolName }
          : { type: `tool-${chunk.toolName}` }),
        toolCallId: chunk.toolCallId,
        input: chunk.input,
        state: "output-error",
        errorText: chunk.error instanceof Error ? chunk.error.message : `${chunk.error}`,
      };
    }
  }

  // 其他类型的现在遇不到，不用处理
}

/**
 * v4 AI message 上面的 experimental_attachments 会被忽略，使用 attachments
 * v5 AI message 的 parts 里，type: file 的部分会被忽略，使用 attachments
 * 重要：这是唯一会保存 ChatMessage 的地方，这一点要始终遵循，确保保存 ChatMessage 的规则一致
 */
export const persistentAIMessageToDB = async ({
  mode,
  userChatId,
  message,
  attachments,
  tx,
}: {
  mode: "override" | "append"; // 前端发送上来的消息，addToolResult 和 user message 都只有最后一个 part，所以是 append
  userChatId: number;
  message: UIMessage;
  attachments?: ChatMessageAttachment[]; // 暂时还没地方用到，现在唯一存储 attachments 的地方，在 createStudyUserChatAction 里直接实现了
  tx?: Omit<typeof prisma, ITXClientDenyList>;
}) => {
  // 很奇怪，现在 addToolResult 不再是只有最后一个 part 了，而是完整 message
  // 可能是因为 convertToFlattenModelMessages update 2026-01-18 修复的关系
  //
  // update: 找到原因了，是因为 prepareLastUIMessageForRequest 方法之前在前端过滤了
  //   const parts = allParts.filter((part) => part.type == "text" || isToolUIPart(part));
  // 让我误以为，addToolResult 只会发送最后一个 part，其实是可以过滤了 reasoning part 又正好没有 text part，
  // 导致模型回复了 reasoning 消息在 addToolResult 以后只发回 tool 消息 ...
  // 所以，恢复，这里应该永远都是 override 的逻辑，不可能存在 append 的逻辑
  // const mode: "override" | "append" = "override";

  // 更新：现在为了更好的类型校验 （assistant 消息可能有很长的 parts，每次传递所有 parts总会出问题），所以还是恢复 append 模式，见 ClientMessagePayload

  if (!tx) {
    tx = prisma;
  }

  const {
    id: messageId,
    role,
    // content
    parts,
    // createdAt,
    // experimental_attachments, // v4 字段 忽略，用不到，不用保存，而且里面会有 base64 file content, 保存下来太大了
    ...extra
  } = message;

  const logger = rootLogger.child({ messageId, userChatId });

  // attachments 统一保存到 message 的 attachments 字段上，从 parts 里移除
  const newPartsExcludeFiles = parts.filter((part) => part.type !== "file");
  // content 字段在 v5 中其实没用了，但是兼容下，先保存，之后需要去掉
  const compatibleContent = (parts: UIMessage["parts"]) =>
    parts
      .map((part) => (part.type === "text" || part.type === "reasoning" ? part.text : ""))
      .filter((text) => text.trim().length > 0)
      .join("\n") || "[EMPTY]";

  const lastMessage = await tx.chatMessage.findFirst({
    where: { userChatId },
    orderBy: { id: "desc" },
  });

  // 如果最后一条消息的 role 和新增的不同，直接新增一条消息
  if (!lastMessage || role !== lastMessage.role) {
    await tx.chatMessage
      .create({
        data: {
          userChatId,
          messageId,
          role,
          content: compatibleContent(newPartsExcludeFiles),
          parts: newPartsExcludeFiles as InputJsonValue,
          extra: extra as InputJsonValue,
          ...(attachments ? { attachments } : undefined),
        },
      })
      .catch((error) => {
        logger.error({
          msg: "Failed to create chatMessage",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  } else if (mode === "override") {
    // if (!(parts[0] && parts[0].type === "text" && isSystemMessage(parts[0].text))) {
    // 但如果当前消息是 [READY] 或者 [CONTINUE] 这种，则不覆盖，直接忽略
    await tx.chatMessage
      .update({
        where: { id: lastMessage.id },
        data: {
          messageId,
          content: compatibleContent(newPartsExcludeFiles),
          parts: newPartsExcludeFiles as InputJsonValue,
          extra: extra as InputJsonValue,
          ...(attachments ? { attachments } : undefined),
        },
      })
      .catch((error) => {
        logger.error({
          msg: "Failed to update chatMessage (override)",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  } else if (role === "user" && mode === "append") {
    // 追加 user 消息
    const partsToUpdate = convertDBMessageToAIMessage(lastMessage).parts;
    for (const newPart of newPartsExcludeFiles) {
      // 重复的忽略
      const lastPart = partsToUpdate.at(-1);
      if (lastPart?.type === "text" && newPart.type === "text" && lastPart.text === newPart.text) {
        continue;
      }
      partsToUpdate.push(newPart);
    }
    await tx.chatMessage
      .update({
        where: { id: lastMessage.id },
        data: {
          messageId,
          content: compatibleContent(partsToUpdate),
          parts: partsToUpdate as InputJsonValue,
          extra: extra as InputJsonValue,
          ...(attachments ? { attachments } : undefined),
        },
      })
      .catch((error) => {
        logger.error({
          msg: "Failed to update chatMessage (user append)",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  } else if (role === "assistant" && mode === "append") {
    // 追加 assistant 消息
    const partsToUpdate = convertDBMessageToAIMessage(lastMessage).parts;
    for (const newPart of newPartsExcludeFiles) {
      if (isToolOrDynamicToolUIPart(newPart)) {
        // 这种情况应该是 addToolResult，需要更新已有的 tool call
        const index = partsToUpdate.findIndex(
          (part) => isToolOrDynamicToolUIPart(part) && part.toolCallId === newPart.toolCallId,
        );
        if (index !== -1) {
          const oldPart = partsToUpdate[index] as ToolUIPart | DynamicToolUIPart;
          if (oldPart.state === "input-available" && newPart.state === "output-available") {
            // 这种情况特殊处理，只覆盖状态，确保前端发送的时候如果不小心损坏了 part 的数据也没关系
            partsToUpdate[index] = {
              ...oldPart,
              state: newPart.state,
              output: newPart.output,
            } as typeof newPart;
          } else {
            partsToUpdate[index] = newPart;
          }
        } else {
          partsToUpdate.push(newPart);
        }
      } else {
        partsToUpdate.push(newPart);
      }
    }
    await tx.chatMessage
      .update({
        where: { id: lastMessage.id },
        data: {
          messageId,
          content: compatibleContent(partsToUpdate),
          parts: partsToUpdate as InputJsonValue,
          extra: extra as InputJsonValue,
          ...(attachments ? { attachments } : undefined),
        },
      })
      .catch((error) => {
        logger.error({
          msg: "Failed to update chatMessage (assistant append)",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  } else {
    // 如果是 system 消息，应该抛出异常
  }
};

export const createDebouncePersistentMessage = (
  userChatId: number,
  mills: number,
  logger: Logger,
) => {
  let timeout: NodeJS.Timeout | null = null;
  let func: () => Promise<void>;
  const debouncePersistentMessage = async (
    message: UIMessage,
    { immediate }: { immediate?: boolean } = {},
  ) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    func = async () => {
      try {
        await persistentAIMessageToDB({
          mode: "override",
          userChatId,
          message,
        });
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
 * ⚠️ 这个方法会忽略 attachments
 */
export function convertDBMessageToAIMessage({
  messageId: id,
  role: _role,
  parts: _parts,
  extra: _extra,
  // content,
  // attachments,
  // createdAt,
}: Pick<ChatMessage, "messageId" | "role" | "parts" | "extra">): UIMessage {
  const role = _role as UIMessage["role"]; // 直接忽略 role: data，这个不可能出现
  const parts = ((_parts ?? []) as ChatMessagePart[]).map(convertToV5MessagePart);
  const extra = _extra as Omit<UIMessage, "id" | "role" | "parts"> | null;
  const message: UIMessage = {
    ...extra,
    id,
    role,
    parts,
  };
  return message;
}

/**
 * 这个方法兼容 v4 和 v5 ai sdk 格式的 dbmessage 作为输入，返回结果满足 v5 的格式
 */
export async function convertDBMessagesToAIMessages(
  dbMessages: ChatMessage[],
  options: {
    convertObjectUrl?: "HttpUrl" | "DataUrl";
  } = {},
): Promise<UIMessage[]> {
  const {
    // 默认会把文件转换为 DataUrl，一般是服务端要给 LLM 的时候用 DataUrl，但是客户端读取消息的时候，用 FileUrl 就行
    convertObjectUrl = "DataUrl",
  } = options;
  const aiMessages = await Promise.all(
    dbMessages.map(
      async ({
        messageId: id,
        role: _role,
        // content,
        parts: _parts,
        extra: _extra,
        attachments: _attachments,
        // createdAt,
      }) => {
        const role = _role as UIMessage["role"]; // 直接忽略 role: data，这个不可能出现
        const parts = ((_parts ?? []) as ChatMessagePart[]).map(convertToV5MessagePart);
        const attachments = (_attachments ?? []) as ChatMessageAttachment[];
        const fileParts = await Promise.all(
          attachments.map(async ({ name, objectUrl, mimeType, size }, index) => {
            const url =
              convertObjectUrl === "HttpUrl"
                ? await getS3SignedCdnUrl(objectUrl)
                : convertObjectUrl === "DataUrl"
                  ? await fileUrlToDataUrl({ objectUrl, mimeType })
                  : "";
            // 和 bedrock api 交互的时候，现在 filename 用中文字符和.都会有问题，但这个字段其实对模型没用处
            // dataurl 模式下文件名直接构造一个 uniqueId 就行了
            // httpurl 模式因为只是给用户看的，依然保留原来可读的文件名
            const filename =
              convertObjectUrl === "HttpUrl"
                ? name
                : convertObjectUrl === "DataUrl"
                  ? `attachment-message[${id}]-${index}`
                  : "";
            return {
              type: "file",
              mediaType: mimeType,
              filename: filename,
              url: url,
              providerMetadata: {
                extra: { objectUrl, size }, // 不管3721，都放进去，但不要依赖这个值
              },
            } as Extract<UIMessage["parts"][number], { type: "file" }>;
          }),
        );
        const extra = _extra as Omit<UIMessage, "id" | "role" | "parts"> | null;
        const message: UIMessage = {
          ...extra,
          id,
          role,
          parts: [...parts, ...fileParts],
        };
        return message;
      },
    ),
  );
  return aiMessages;
}

function _calculateToolUseCount(dbMessages: ChatMessage[]) {
  const toolUseCount = dbMessages.reduce(
    (_count, message) => {
      const count = { ..._count };
      ((message.parts ?? []) as ChatMessagePart[]).forEach((_part) => {
        const part = convertToV5MessagePart(_part);
        if (isToolUIPart(part) && part.state === "output-available") {
          const toolName = getToolName(part);
          count[toolName] = (count[toolName] || 0) + 1;
        }
        // if (_part.type === "tool-invocation") {
        //   // v4 message
        //   const part = _part as unknown as Extract<V4MessagePart, { type: "tool-invocation" }>;
        //   if (part.toolInvocation.state === "result") {
        //     const toolName = part.toolInvocation.toolName as ToolName;
        //     count[toolName] = (count[toolName] || 0) + 1;
        //   }
        // } else if (_part.type.startsWith("tool-")) {
        //   // v5 message, see https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#tool-part-type-changes-uimessage
        //   const part = _part as unknown as Extract<
        //     UIMessage["parts"][number],
        //     { type: `tool-${string}` }
        //   >;
        //   // aka: const part = part as unknown as { type: `tool-${string}` } & UIToolInvocation<Tool>;
        //   // aka: const part = part as unknown as ToolUIPart // better
        //   if (part.state === "output-available") {
        //     const toolName = part.type.slice(5) as ToolName;
        //     count[toolName] = (count[toolName] || 0) + 1;
        //   }
        // }
      });
      return count;
    },
    {} as Record<string, number>,
  );
  return toolUseCount;
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
    tools,
  }: {
    checkpointId?: number; // 给 LLM 的消息从 id > checkpointId 开始取，这里不是 messageId 而是 ChatMessage 的数据库 id，并且 id 是递增的
    tools: ToolSet; // tools 必须提供，这样在转成 ModelMessage 的时候，会调用 tool 上的 toModelOutput 方法，只把 PlainText 部分传给 LLM
  },
) {
  const dbMessages = await prisma.chatMessage.findMany({
    where: checkpointId ? { userChatId, id: { gt: checkpointId } } : { userChatId },
    orderBy: { id: "asc" },
  });
  // 使用 fixChatMessages 之前的统计数据，因为 fixChatMessages 会把没完成的 tool calls 变成完成
  const toolUseCount = _calculateToolUseCount(dbMessages);
  const aiMessages = fixChatMessages(await convertDBMessagesToAIMessages(dbMessages)); // 传给 LLM 的时候需要修复
  let streamingMessage: Omit<UIMessage, "role"> & {
    role: "assistant";
  };
  if (aiMessages[aiMessages.length - 1]?.role === "assistant") {
    const lastMessage = aiMessages[aiMessages.length - 1];
    streamingMessage = {
      ...lastMessage,
      parts: lastMessage.parts ?? [],
      role: "assistant",
    };
  } else {
    streamingMessage = {
      id: generateId(),
      // content: "",
      parts: [],
      role: "assistant",
    };
  }
  // convertToCoreMessages 会把 role 全都是 assistant 并且包含 toolInvocation 的 part 转成
  // 一个 role: assistant 的 tool calling 内容 + 一个 role: tool 的 toll result 内容
  // 这样 LLM 才能理解，否则直接把 aiMessages 给 LLM 它会认为 tool 没执行 ...
  // 不知道之前没有一条条保存信息的时候，vercel ai sdk 是哪个阶段处理的，现在一定要人工转一次
  // ⚠️ tools 必须提供，这样在转成 ModelMessage 的时候，会调用 tool 上的 toModelOutput 方法，只把 PlainText 部分传给 LLM
  const coreMessages = convertToFlattenModelMessages(aiMessages, {
    tools,
    // ignoreIncompleteToolCalls: true,
  });
  return {
    coreMessages,
    streamingMessage,
    toolUseCount,
  };
}

/**
 *
 * see https://github.com/vercel/ai/issues/8516
 * anthropic 不支持连续的 tool-call 和 tool-result 在一个 block 里
 * [{ type: assistant, content: [ text, tool-call(id:1), text, tool-call(id:2), text ] }]
 * [{ type: tool, content: [ tool-result(id:1), tool-result(id:2) ] }]
 *
 * tool-call 后面必须接着 tool-result，要拆成这样
 * [{ type: assistant, content: [ text, tool-call(id:1) ] }]
 * [{ type: tool, content: [ tool-result(id:1) ] }]
 * [{ type: assistant, content: [ text, tool-call(id:2) ] }]
 * [{ type: tool, content: [ tool-result(id:2) ] }]
 * [{ type: assistant, content: [ text ] }]
 *
 * convertToFlattenModelMessages 的实现是先把 UIMessage 拆了，一旦遇到 ToolUIPart 就拆到单独的一个 UIMessage 里
 * 这样 convertToModelMessages 的时候，tool-call 和 tool-result 就一定是连续的了
 */
export function convertToFlattenModelMessages(
  messages: Array<Omit<UIMessage, "id">>,
  options: {
    tools: ToolSet;
    ignoreIncompleteToolCalls?: boolean;
  },
): ModelMessage[] {
  // const flattenMessages: Array<Omit<UIMessage, "id">> = [];
  // let lastMessage: Omit<UIMessage, "id">;
  // for (const { parts, role, metadata } of messages) {
  //   lastMessage = { role, metadata, parts: [] };
  //   for (const part of parts) {
  //     if (!isToolOrDynamicToolUIPart(part)) {
  //       lastMessage.parts.push(part);
  //     } else {
  //       flattenMessages.push(lastMessage);
  //       flattenMessages.push({ role, metadata, parts: [part] });
  //       lastMessage = { role, metadata, parts: [] };
  //     }
  //   }
  //   if (lastMessage.parts.length > 0) {
  //     flattenMessages.push(lastMessage);
  //   }
  // }
  // const coreMessages = convertToModelMessages(flattenMessages, options);

  // 👀 update 2026-01-18:
  // https://github.com/vercel/ai/issues/8516#issuecomment-3651551098
  // 通过在两个 tool call 之间插入 step-start，可以让 tool-call 和 tool-result 消息配对，实现和上面注释掉的代码一样效果
  const fixedMessages = messages.map(({ parts, ...message }) => {
    const fixedParts: typeof parts = [{ type: "step-start" }];
    for (const part of parts) {
      if (part.type === "step-start") {
        continue;
      }
      fixedParts.push(part);
      if (isToolOrDynamicToolUIPart(part)) {
        fixedParts.push({ type: "step-start" });
      }
    }
    if (fixedParts.at(-1)?.type === "step-start") {
      fixedParts.pop();
    }
    return {
      ...message,
      parts: fixedParts,
    };
  });
  const coreMessages = convertToModelMessages(fixedMessages, options);
  return coreMessages;
}

function fixChatMessages(messages: UIMessage[]): UIMessage[] {
  let fixed: UIMessage[] = messages.map((message) => {
    if (!message.parts) {
      return message;
    }
    // 给 pending 的 tool 都标记下
    let parts = message.parts.map((part) => {
      if (!isToolOrDynamicToolUIPart(part)) {
        return part;
      }
      if (part.state === "output-available" || part.state === "output-error") {
        return part;
      }
      // 如果不是 result 或者 error，一定是执行了一半挂了，要告诉大模型
      return {
        ...part,
        state: "output-error" as const,
        errorText: "Tool execution interrupted due to unknown reasons",
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
    if (!message.parts?.length /* && !message.content.trim() */) {
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
