import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { StudyUITools, ToolName } from "@/ai/tools/types";
import { parseAttachmentText } from "@/lib/attachments/processing";
import {
  Analyst,
  AttachmentFile,
  AttachmentFileExtra,
  ChatMessageAttachment,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  ModelMessage,
  ToolUIPart,
} from "ai";
import { Locale } from "next-intl";

export async function outOfBalance({ userId }: { userId: number }) {
  const { balance } = await getUserTokens({ userId });
  return balance <= 0;
}

/**
 * claude 模型支持 cache https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
 * 最多 4 个 checkpoints，checkpoint 至少 1024 tokens, study agent 第一个 assistant 消息回复以后至少有这个 token 量
 */
export function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    firstAssistant: false,
    saveAnalystStudySummary: false,
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
    if (
      message.role === "assistant" &&
      Array.isArray(message.content) &&
      message.content.find(
        (content) =>
          content.type === "tool-call" && content.toolName === ToolName.saveAnalystStudySummary,
      ) &&
      !checkpoints["saveAnalystStudySummary"]
    ) {
      checkpoints["saveAnalystStudySummary"] = true;
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
}: {
  locale: Locale;
  studyUserChatId: number;
  userId: number;
}) {
  const personaImportCount = await prisma.personaImport.count({
    where: { userId },
  });
  if (!personaImportCount) {
    return;
  }
  const messageId = generateId();
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
  await persistentAIMessageToDB({
    userChatId: studyUserChatId,
    message: {
      id: messageId,
      role: "assistant",
      // content: toolInvocation.args.question,
      parts: [toolPart],
    },
  });
  // return createUIMessageStreamResponse({
  //   execute: async (dataStream) => {
  //     dataStream.write(formatDataStreamPart("start_step", { messageId }));
  //     dataStream.write(formatDataStreamPart("tool_call", toolInvocation));
  //     dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
  //   },
  // });
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "tool-input-start", toolCallId, toolName: ToolName.requestInteraction });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: ToolName.requestInteraction,
        input: toolPart.input,
      });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function shouldProcessAttachments({
  analyst,
  locale,
}: {
  analyst: Analyst;
  locale: Locale;
}): Promise<
  | {
      processing: false;
      attachments: (Omit<AttachmentFile, "extra"> & { extra: AttachmentFileExtra })[];
    }
  | {
      processing: true;
      response: Response;
    }
> {
  // Check attachments and process if needed
  const analystAttachments = (analyst.attachments ?? []) as ChatMessageAttachment[];

  if (!analystAttachments.length) {
    return { processing: false, attachments: [] };
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
    return { processing: false, attachments: attachmentFilesWithExtra };
  }

  // Some files need processing - create a stream to show progress
  const stream = createUIMessageStream({
    async execute({ writer }) {
      const messageId = "processing-attachments";
      writer.write({ type: "start" });

      writer.write({ id: messageId, type: "text-start" });
      writer.write({
        id: messageId,
        type: "text-delta",
        delta:
          locale === "zh-CN"
            ? "正在处理附件，请稍候...\n"
            : "Processing attachments, please wait...\n",
      });
      writer.write({
        id: messageId,
        type: "text-delta",
        delta: attachmentFilesWithExtra.map((file) => `${file.name}\n`).join(""),
      });

      // Process all files that need processing
      try {
        await Promise.all(attachmentFilesWithExtra.map((file) => parseAttachmentText(file.id)));

        await new Promise((resolve) => setTimeout(resolve, 3000));

        writer.write({
          id: messageId,
          type: "text-delta",
          delta:
            locale === "zh-CN"
              ? "附件处理完毕，可以继续对话了。"
              : "Attachment processing completed. You can continue the conversation.",
        });
        writer.write({ id: messageId, type: "text-end" });
      } catch (error) {
        writer.write({ id: messageId, type: "text-start" });
        writer.write({
          id: messageId,
          type: "text-delta",
          delta:
            locale === "zh-CN"
              ? `附件处理失败：${(error as Error).message}`
              : `Attachment processing failed: ${(error as Error).message}`,
        });
        writer.write({ id: messageId, type: "text-end" });
      }

      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  const response = createUIMessageStreamResponse({ stream });
  return {
    processing: true,
    response,
  };
}
