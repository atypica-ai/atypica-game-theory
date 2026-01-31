import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { UserChatContext } from "@/app/(study)/context/types";
import { categorizeFiles, FILE_UPLOAD_LIMITS } from "@/lib/fileUploadLimits";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { ChatMessageAttachment, UserChat, UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";

/**
 * Core logic for creating a study user chat
 * Shared between Web UI (via server action) and MCP (via tool handler)
 */
export async function createStudyUserChat({
  userId,
  role,
  content,
  attachments,
  context,
  extra,
}: {
  userId: number;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatMessageAttachment[];
  context?: UserChatContext;
  extra?: UserChatExtra;
}): Promise<Omit<UserChat, "kind"> & { kind: "study" }> {
  // Validate file upload limits
  if (attachments && attachments.length > 0) {
    const fileInfos = attachments.map((att) => ({
      name: att.name,
      size: att.size,
      mimeType: att.mimeType,
      url: "", // Not needed for validation
      objectUrl: att.objectUrl,
    }));

    const { images, documents } = categorizeFiles(fileInfos);

    if (images.length > FILE_UPLOAD_LIMITS.MAX_IMAGES) {
      throw new Error(`Maximum ${FILE_UPLOAD_LIMITS.MAX_IMAGES} images allowed`);
    }

    if (documents.length > FILE_UPLOAD_LIMITS.MAX_DOCUMENTS) {
      throw new Error(`Maximum ${FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} documents allowed`);
    }

    const totalSize = attachments.reduce((acc, att) => acc + att.size, 0);
    if (totalSize > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
      throw new Error("Total file size limit exceeded");
    }
  }

  // 根据用户输入决定模型的默认语言
  const locale = await detectInputLanguage({
    text: content,
  });

  const userChat = await prisma.$transaction(async (tx) => {
    const userChat = await createUserChat({
      userId,
      title: truncateForTitle(content, {
        maxDisplayWidth: 100,
        suffix: "...",
      }),
      kind: "study",
      extra,
      context,
      tx,
    });
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: userChat.id,
      message: {
        id: generateId(),
        role,
        parts: [{ type: "text", text: content }],
      },
      // attachments, // attachments 只保存在 analyst 上，然后在 baseAgentRequest 中提前处理好了以后，插入 messages 中
      tx,
    });
    await tx.analyst.create({
      data: {
        userId,
        studyUserChatId: userChat.id,
        // 现在不再是提前选择研究类型了，所以一开始都是 null
        kind: null,
        brief: content, // 用户的第一条消息作为 brief
        locale,
        role: "",
        topic: "",
        studySummary: "",
        studyLog: "",
        attachments: attachments,
      },
    });
    return userChat;
  });

  return {
    ...userChat,
    kind: "study",
  };
}
