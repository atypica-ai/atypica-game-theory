import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { UserChatContext } from "@/app/(study)/context/types";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { ChatMessageAttachment, UserChat, UserChatExtra, UserChatKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { syncProject as syncProjectToMeili } from "@/search/lib/sync";
import { waitUntil } from "@vercel/functions";
import { generateId } from "ai";
import { getLocale } from "next-intl/server";

/**
 * Core logic for creating a universal user chat.
 * Shared between Web UI (via server action) and MCP (via tool handler).
 * Does not use withAuth — caller must supply userId.
 */
export async function createUniversalUserChat({
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
}): Promise<Omit<UserChat, "kind"> & { kind: Extract<UserChatKind, "universal"> }> {
  // Assign IDs to attachments (chat-level monotonic increment)
  let attachmentsWithIds: (ChatMessageAttachment & { id: number })[] | undefined;
  if (attachments && attachments.length > 0) {
    const existingAttachments = context?.attachments ?? [];
    const nextId = Math.max(0, ...existingAttachments.map((a) => a.id)) + 1;
    attachmentsWithIds = attachments.map((att, i) => ({
      ...att,
      id: nextId + i,
    }));
  }

  // Build message text with attachment markers
  const attachmentMarkers = attachmentsWithIds?.map((a) => `[#${a.id} ${a.name}]`).join("\n");
  const messageText = attachmentMarkers ? `${attachmentMarkers}\n${content}` : content;

  // Detect default locale from input
  const defaultLocale = await detectInputLanguage({
    text: content,
    fallbackLocale: await getLocale(),
  });

  const userChat = await prisma.$transaction(async (tx) => {
    const chat = await createUserChat({
      userId,
      title: truncateForTitle(content, {
        maxDisplayWidth: 100,
        suffix: "...",
      }),
      kind: "universal",
      extra,
      context,
      tx,
    });

    await persistentAIMessageToDB({
      mode: "append",
      userChatId: chat.id,
      message: {
        id: generateId(),
        role,
        parts: [{ type: "text", text: messageText }],
      },
      tx,
    });

    await mergeUserChatContext({
      id: chat.id,
      context: {
        defaultLocale,
        ...(attachmentsWithIds ? { attachments: attachmentsWithIds } : {}),
      },
      tx,
    });

    return chat;
  });

  // 同步到 Meilisearch（创建时 title 已就绪）
  waitUntil(
    syncProjectToMeili({ type: "universal", id: userChat.id }).catch(() => {
      // 方法里已经 log 了，无需再次 log，这里跳过错误
    }),
  );

  return {
    ...userChat,
    kind: "universal",
  };
}
