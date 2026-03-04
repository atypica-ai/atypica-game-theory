import "server-only";

import { AgentToolConfigArgs } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/lib";
import { parseAttachmentText } from "@/lib/attachments/processing";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import {
  readAttachmentInputSchema,
  readAttachmentOutputSchema,
  ReadAttachmentToolResult,
} from "./types";

export const readAttachmentTool = ({
  userId,
  userChatId,
  logger,
}: {
  userId: number;
  userChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Read the content of a user-uploaded attachment file by its ID (shown as [#N filename] in messages). " +
      "Use head_tail mode to preview large files before reading in full. Also supports reading image files.",
    inputSchema: readAttachmentInputSchema,
    outputSchema: readAttachmentOutputSchema,
    toModelOutput: (result: ReadAttachmentToolResult) => {
      if (result.image) {
        return {
          type: "content",
          value: [{ type: "media", data: result.image.data, mediaType: result.image.mimeType }],
        };
      }
      return { type: "text", value: result.plainText };
    },
    execute: async ({ attachmentId, mode, limit }): Promise<ReadAttachmentToolResult> => {
      // 1. Read fresh attachments from UserChat context
      const userChat = await prisma.userChat.findUnique({
        where: { id: userChatId },
        select: { context: true },
      });
      const attachments = userChat?.context?.attachments ?? [];

      // 2. Find attachment by ID
      const attachment = attachments.find((a) => a.id === attachmentId);
      if (!attachment) {
        return { plainText: `[Error] Attachment #${attachmentId} not found.` };
      }

      // 3. Find AttachmentFile record in DB
      const file = await prisma.attachmentFile.findFirst({
        where: { objectUrl: attachment.objectUrl, userId },
      });
      if (!file) {
        return { plainText: `[Error] File record not found for attachment #${attachmentId}.` };
      }

      // 4. Image files: return as image data for model to "see"
      if (file.mimeType.startsWith("image/")) {
        const dataUrl = await fileUrlToDataUrl({
          objectUrl: file.objectUrl,
          mimeType: file.mimeType,
        });
        // dataUrl format: "data:image/webp;base64,xxxxx"
        const base64Data = dataUrl.split(",")[1];
        const mimeType = dataUrl.match(/^data:([^;]+)/)?.[1] ?? file.mimeType;
        return {
          plainText: `[Image: ${attachment.name} (${mimeType})]`,
          image: { data: base64Data, mimeType },
        };
      }

      // 5. Text files: lazy process on first access
      let compressedText = file.extra.compressedText;

      if (!compressedText) {
        logger.info({
          msg: "Lazy processing attachment on first access",
          attachmentId,
          fileId: file.id,
          fileName: attachment.name,
        });
        const processed = await parseAttachmentText(file.id);
        compressedText = processed.extra.compressedText;

        if (!compressedText) {
          const errorMsg = processed.extra.error ?? "Unknown processing error";
          return {
            plainText: `[Error] Failed to process attachment #${attachmentId}: ${errorMsg}`,
          };
        }
      }

      // 6. Return content based on mode
      switch (mode) {
        case "full":
          return { plainText: compressedText };
        case "head":
          return { plainText: compressedText.slice(0, limit) };
        case "tail":
          return { plainText: compressedText.slice(-limit) };
        case "head_tail": {
          if (compressedText.length <= limit * 2) {
            return { plainText: compressedText };
          }
          const head = compressedText.slice(0, limit);
          const tail = compressedText.slice(-limit);
          return { plainText: `${head}\n\n...\n\n${tail}` };
        }
      }
    },
  });
