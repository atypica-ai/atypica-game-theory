import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { UserChatContext } from "@/app/(study)/context/types";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { ChatMessageAttachment, UserChat, UserChatExtra, UserChatKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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
        parts: [{ type: "text", text: content }],
      },
      tx,
    });

    await mergeUserChatContext({
      id: chat.id,
      context: {
        defaultLocale,
        ...(attachments ? { attachments } : {}),
      },
      tx,
    });

    return chat;
  });

  return {
    ...userChat,
    kind: "universal",
  };
}
