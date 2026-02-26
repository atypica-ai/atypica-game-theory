import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { truncateForTitle } from "@/lib/textUtils";
import { UserChat, UserChatKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";

/**
 * Core logic for creating a universal user chat.
 * Shared between MCP (via tool handler) and other server-side callers that already have userId.
 * Does not use withAuth — caller must supply userId.
 */
export async function createUniversalChatDirect({
  userId,
  role,
  content,
}: {
  userId: number;
  role: "user" | "assistant";
  content: string;
}): Promise<Omit<UserChat, "kind"> & { kind: Extract<UserChatKind, "universal"> }> {
  const userChat = await prisma.$transaction(async (tx) => {
    const chat = await createUserChat({
      userId,
      title: truncateForTitle(content, {
        maxDisplayWidth: 100,
        suffix: "...",
      }),
      kind: "universal",
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

    return chat;
  });

  return {
    ...userChat,
    kind: "universal",
  };
}
