import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { LLMModelName } from "@/ai/provider";
import { UserChatContext } from "@/app/(study)/context/types";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/lib";
import { parseAttachmentText } from "@/lib/attachments/processing";
import { AttachmentFileExtra, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { BedrockProviderOptions } from "@ai-sdk/amazon-bedrock";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  createUIMessageStream,
  generateId,
  JSONValue,
  ModelMessage,
  ReasoningUIPart,
  ToolUIPart,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { Locale } from "next-intl";

export async function outOfBalance({ userId }: { userId: number }) {
  const { balance } = await getUserTokens({ userId });
  return balance !== "Unlimited" && balance <= 0;
}

export function calculateToolUsage(modelMessages: ModelMessage[]) {
  const toolUseCount = modelMessages
    .filter((message) => message.role === "tool")
    .reduce(
      (_count, message) => {
        const count = { ..._count };
        (message.content ?? []).forEach((part) => {
          const toolName = part.toolName as StudyToolName;
          count[toolName] = (count[toolName] || 0) + 1;
        });
        return count;
      },
      {} as Partial<Record<StudyToolName, number>>,
    );
  return toolUseCount;
}

/**
 * claude 模型支持 cache https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
 * 最多 4 个 checkpoints，checkpoint 至少 1024 tokens, study agent 第一个 assistant 消息回复以后至少有这个 token 量
 */
export function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model

  const checkpoints = {
    ">=12": false,
    ">=24": false,
    ">=36": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = {
      bedrock: { cachePoint: { type: "default" } },
      anthropic: { cacheControl: { type: "ephemeral" } } satisfies AnthropicProviderOptions,
    };
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=12"]) {
      checkpoints[">=12"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 4 && !checkpoints[">=24"]) {
      checkpoints[">=24"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 16 && !checkpoints[">=36"]) {
      checkpoints[">=36"] = true;
      return { ...message, providerOptions };
    }
    return { ...message };
  });
  return cachedCoreMessages;
}

export async function shouldDecidePersonaTier({
  locale,
  studyUserChatId,
  userId,
  streamWriter,
  streamingMessage,
}: {
  locale: Locale;
  studyUserChatId: number;
  userId: number;
  streamWriter: UIMessageStreamWriter;
  streamingMessage: UIMessage;
}) {
  const personaImportCount = await prisma.personaImport.count({
    where: { userId },
  });
  if (!personaImportCount) {
    return false;
  }
  const toolCallId = generateId();
  // ToolUIPart<UIToolConfigs> 会根据 type 推断出 input 类型
  const toolPart: ToolUIPart<StudyUITools> = {
    toolCallId,
    type: `tool-${StudyToolName.requestInteraction}`,
    input:
      locale === "zh-CN"
        ? {
            question: `我们发现您曾导入过 ${personaImportCount} 位真人画像。在本次研究中，您希望如何使用这些画像？`,
            options: [
              "优先使用我的真人画像（不足时由AI画像补充）",
              "仅使用 Atypica 合成的 AI 画像",
            ],
            maxSelect: 1,
          }
        : {
            question: `We've found ${personaImportCount} private personas you've imported. How would you like to use them in this study?`,
            options: [
              "Prioritize my private personas (supplemented with AI personas if needed)",
              "Use only Atypica's synthesized AI personas",
            ],
            maxSelect: 1,
          },
    state: "input-available",
  };
  streamingMessage.parts.push(toolPart);
  await persistentAIMessageToDB({
    mode: "override",
    userChatId: studyUserChatId,
    message: streamingMessage,
  });
  // return createUIMessageStreamResponse({
  //   execute: async (dataStream) => {
  //     dataStream.write(formatDataStreamPart("start_step", { messageId }));
  //     dataStream.write(formatDataStreamPart("tool_call", toolInvocation));
  //     dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
  //   },
  // });
  const stream = createUIMessageStream({
    generateId: () => streamingMessage.id,
    execute({ writer }) {
      writer.write({ type: "start" }); // 这个是必须的，发送了才能让设置的 messageId 生效
      writer.write({ type: "start-step" });
      writer.write({
        type: "tool-input-start",
        toolCallId,
        toolName: StudyToolName.requestInteraction,
      });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: StudyToolName.requestInteraction,
        input: toolPart.input,
      });
      writer.write({ type: "finish-step" });
      // writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  // return createUIMessageStreamResponse({ stream });
  streamWriter.merge(stream);
  return true;
}

export async function waitUntilAttachmentsProcessed({
  userId,
  userChatContext,
  locale,
  streamWriter,
  streamingMessage,
}: {
  userId: number;
  userChatContext: UserChatContext;
  locale: Locale;
  streamWriter?: UIMessageStreamWriter;
  streamingMessage: UIMessage;
}): Promise<
  ({ type: "image"; mimeType: string; dataUrl: string } | { type: "text"; text: string })[]
> {
  // Check attachments and process if needed
  const analystAttachments = (userChatContext.attachments ?? []) as ChatMessageAttachment[];

  if (!analystAttachments.length) {
    return [];
  }

  // Find all attachment files by objectUrl
  const attachmentFiles = await prisma.attachmentFile.findMany({
    where: {
      userId: userId,
      objectUrl: { in: analystAttachments.map((a) => a.objectUrl) },
    },
  });

  const attachmentFilesWithExtra = attachmentFiles.map((file) => ({
    ...file,
    extra: file.extra as unknown as AttachmentFileExtra,
  }));

  // Check if all files are ready (skip status)
  const SUPPORTED_MIME_TYPES = ["application/pdf", "text/plain", "text/csv"];
  const allFilesReady = attachmentFilesWithExtra.every((file) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) return true; // skip
    if (file.extra.compressedText) return true; // skip
    if (file.extra.error) return true; // skip
    return false; // needs processing
  });

  if (allFilesReady) {
    return await Promise.all(
      attachmentFilesWithExtra.map(async ({ objectUrl, mimeType, extra }) => {
        if (mimeType.startsWith("image/")) {
          return {
            type: "image",
            mimeType,
            dataUrl: await fileUrlToDataUrl({ objectUrl, mimeType }),
          };
        } else {
          // 非 image 的，因为现在只可能是文本类型的文件，比如 pdf，就都取 compressedText
          return { type: "text", text: extra.compressedText ?? "[EMPTY]" };
        }
      }),
    );
  }

  const promise = new Promise<void>((resolve, reject) => {
    const stream = createUIMessageStream({
      generateId: () => streamingMessage.id, // 固定 id，这很重要，这样就可以把这条消息合并到处理完成将要 streaming 的 assistant message 上了
      async execute({ writer }) {
        const partId = "processing-attachments-text-part";
        writer.write({ type: "start" }); // 这个是必须的，发送了才能让设置的 messageId 生效
        writer.write({ type: "start-step" });
        writer.write({ id: partId, type: "text-start" });
        writer.write({
          id: partId,
          type: "text-delta",
          delta:
            locale === "zh-CN"
              ? "正在处理附件，请稍候...\n"
              : "Processing attachments, please wait...\n",
        });
        writer.write({
          id: partId,
          type: "text-delta",
          delta: attachmentFilesWithExtra.map((file) => `${file.name}\n`).join(""),
        });

        // Process all files that need processing
        try {
          await Promise.all(attachmentFilesWithExtra.map((file) => parseAttachmentText(file.id)));

          await new Promise((resolve) => setTimeout(resolve, 3000));

          writer.write({
            id: partId,
            type: "text-delta",
            delta:
              locale === "zh-CN"
                ? "附件处理完毕，可以继续对话了。"
                : "Attachment processing completed. You can continue the conversation.",
          });
          writer.write({ id: partId, type: "text-end" });
          writer.write({ type: "finish-step" });
          // writer.write({ type: "finish", finishReason: "stop" });
          resolve();
        } catch (error) {
          writer.write({ id: partId, type: "text-start" });
          writer.write({
            id: partId,
            type: "text-delta",
            delta:
              locale === "zh-CN"
                ? `附件处理失败：${(error as Error).message}`
                : `Attachment processing failed: ${(error as Error).message}`,
          });
          writer.write({ id: partId, type: "text-end" });
          writer.write({ type: "finish-step" });
          // writer.write({ type: "finish", finishReason: "stop" });
          reject(error);
        }
      },
    });

    streamWriter?.merge(stream);
  });

  // 等待处理完成
  await promise;
  // const response = createUIMessageStreamResponse({ stream });
  // return {
  //   processing: true,
  //   response,
  // };

  // 重新读取一遍，返回带 parsedContent 的文件
  return await Promise.all(
    (
      await prisma.attachmentFile.findMany({
        where: {
          userId: userId,
          objectUrl: { in: analystAttachments.map((a) => a.objectUrl) },
        },
      })
    ).map(async ({ objectUrl, mimeType, extra }) => {
      if (mimeType.startsWith("image/")) {
        return {
          type: "image",
          mimeType,
          dataUrl: await fileUrlToDataUrl({ objectUrl, mimeType }),
        };
      } else {
        // 非 image 的，因为现在只可能是文本类型的文件，比如 pdf，就都取 compressedText
        return { type: "text", text: (extra as AttachmentFileExtra).compressedText ?? "[EMPTY]" };
      }
    }),
  );
}

/**
 * 有些模型不支持 reasoning 的 signature (存在 content[].providerOptions 里)，比如 minimax, 需要去掉
 */
export function fixReasoningPartsInModelMessages({
  modelName,
  modelMessages,
  providerOptions,
  streamingMessage,
}: {
  modelName: LLMModelName;
  modelMessages: ModelMessage[];
  providerOptions: Record<string, Record<string, JSONValue>>;
  streamingMessage: Omit<UIMessage, "role">;
}): {
  modelMessages: ModelMessage[];
  providerOptions: Record<string, Record<string, JSONValue>>;
} {
  // 有些模型不支持 reasoning 的 signature (存在 content[].providerOptions 里)，比如 minimax, 需要去掉
  if (!modelName?.startsWith("claude") && !modelName?.startsWith("gemini")) {
    modelMessages = modelMessages.map((message) => {
      if (typeof message.content === "string") return message;
      const content = message.content.map((part) => {
        if (part.type !== "reasoning") return part;
        return { type: "reasoning", text: part.text };
      });
      return { ...message, content } as ModelMessage;
    });
  }

  // const lastMessage = modelMessages.at(-1);
  // 不能通过后面的 modelMessages 判断，因为是要看 final assistant turn，也就是多个 assistant parts 在一起是一个 turn
  // 正好 streamingMessage 就是 final assistant turn
  // https://platform.claude.com/docs/en/build-with-claude/extended-thinking
  // ⚠️ 注意 claude 要求 reasoning part 里面的 signature 一起传回去，不然不能被认为是一个 reasoning block
  // 旧的消息都没有 providerMetadata, 那就直接禁用 thinking 了, 新的有, 在 appendStepToStreamingMessage 里修复并保存了
  const reasoningSignatureValid = (part: ReasoningUIPart) => {
    if (
      part.providerMetadata &&
      "bedrock" in part.providerMetadata && // 目前主要模型就是 bedrock, 所以这里只考虑 bedrock
      "signature" in part.providerMetadata["bedrock"]
    ) {
      return true;
    }
    return false;
  };

  const firstPart = streamingMessage.parts.filter((part) => part.type !== "step-start").at(0);
  if (!firstPart) {
    // 保持原配置
  } else if (firstPart.type === "reasoning" && reasoningSignatureValid(firstPart)) {
    // providerOptions["bedrock"] = {
    //   ...providerOptions["bedrock"],
    //   reasoningConfig: { type: "enabled", budgetTokens: 1024 },
    // } satisfies BedrockProviderOptions;
    // ⚠️ 一定要赋值而不是上面这样直接修改，不然会导致全局变量 defaultProviderOptions 被修改掉 ！！！
    providerOptions = {
      ...providerOptions,
      bedrock: {
        ...providerOptions["bedrock"],
        reasoningConfig: { type: "enabled", budgetTokens: 1024 },
      } satisfies BedrockProviderOptions,
      anthropic: {
        ...providerOptions["anthropic"],
        thinking: { type: "enabled", budgetTokens: 1024 },
      } satisfies AnthropicProviderOptions,
    };
  } else {
    // 如果是 assistant 消息继续，在开启 thinking 的时候，claude 会要求最后一个 block 是 thinking 开头，但是没搞明白消息组织形式应该是怎样的，所以，暂时就关闭。
    if (providerOptions["bedrock"]) {
      providerOptions = {
        ...providerOptions,
        bedrock: {
          ...providerOptions["bedrock"],
          reasoningConfig: { type: "disabled" },
        } satisfies BedrockProviderOptions,
      };
    }
    if (providerOptions["anthropic"]) {
      providerOptions = {
        ...providerOptions,
        anthropic: {
          ...providerOptions["anthropic"],
          thinking: { type: "disabled" },
        } satisfies AnthropicProviderOptions,
      };
    }
  }

  return { modelMessages, providerOptions };
}
