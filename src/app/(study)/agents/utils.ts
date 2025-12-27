import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { StudyUITools, ToolName } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/lib";
import { parseAttachmentText } from "@/lib/attachments/processing";
import { Analyst, AttachmentFileExtra, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import {
  createUIMessageStream,
  generateId,
  ModelMessage,
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
          const toolName = part.toolName as ToolName;
          count[toolName] = (count[toolName] || 0) + 1;
        });
        return count;
      },
      {} as Partial<Record<ToolName, number>>,
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
    firstAssistant: false,
    ">=8": false,
    ">=16": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
    if (message.role === "assistant" && !checkpoints["firstAssistant"]) {
      checkpoints["firstAssistant"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=8"]) {
      checkpoints[">=8"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 16 && !checkpoints[">=16"]) {
      checkpoints[">=16"] = true;
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
    type: `tool-${ToolName.requestInteraction}`,
    input:
      locale === "zh-CN"
        ? {
            question: `我们发现您曾导入过 ${personaImportCount} 位真人画像。在本次研究中，您希望如何使用这些画像？`,
            options: [
              "优先使用我的真人画像（不足时由AI画像补充）",
              "仅使用 Atypica 合成的 AI 画像",
            ],
          }
        : {
            question: `We've found ${personaImportCount} private personas you've imported. How would you like to use them in this study?`,
            options: [
              "Prioritize my private personas (supplemented with AI personas if needed)",
              "Use only Atypica's synthesized AI personas",
            ],
          },
    state: "input-available",
  };
  streamingMessage.parts.push(toolPart);
  await persistentAIMessageToDB({
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
      writer.write({ type: "tool-input-start", toolCallId, toolName: ToolName.requestInteraction });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: ToolName.requestInteraction,
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
  analyst,
  locale,
  streamWriter,
  streamingMessage,
}: {
  analyst: Analyst;
  locale: Locale;
  streamWriter: UIMessageStreamWriter;
  streamingMessage: UIMessage;
}): Promise<
  ({ type: "image"; mimeType: string; dataUrl: string } | { type: "text"; text: string })[]
> {
  // Check attachments and process if needed
  const analystAttachments = (analyst.attachments ?? []) as ChatMessageAttachment[];

  if (!analystAttachments.length) {
    return [];
  }

  // Find all attachment files by objectUrl
  const attachmentFiles = await prisma.attachmentFile.findMany({
    where: {
      userId: analyst.userId,
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

    streamWriter.merge(stream);
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
          userId: analyst.userId,
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
