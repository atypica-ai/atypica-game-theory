"use server";

import { convertDBMessagesToAIMessages, persistentAIMessageToDB } from "@/ai/messageUtils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChatKind, type UserChat, type UserChatExtra } from "@/prisma/client";
import { prisma, prismaRO } from "@/prisma/prisma";
import { generateId } from "ai";

/**
 * Create new Universal chat
 */
export async function createUniversalUserChat({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}): Promise<
  ServerActionResult<Omit<UserChat, "kind"> & { kind: Extract<UserChatKind, "universal"> }>
> {
  return withAuth(async (user) => {
    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: truncateForTitle(content, {
          maxDisplayWidth: 100,
          suffix: "...",
        }),
        kind: "universal",
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
        tx,
      });

      return userChat;
    });

    return {
      success: true,
      data: {
        ...userChat,
        kind: "universal",
      },
    };
  });
}

/**
 * Fetch universal user chat by token
 * 这个方法比较特殊，是要过滤 universal or study, 所以不直接用 (study) app 里的通用的 fetchUserChatByToken 方法
 */
export async function fetchUniversalUserChatByToken(token: string): Promise<
  ServerActionResult<
    Omit<UserChat, "kind" | "extra"> & {
      kind: Extract<UserChatKind, "universal" | "study">;
      extra: UserChatExtra;
      messages: Awaited<ReturnType<typeof convertDBMessagesToAIMessages>>;
    }
  >
> {
  return withAuth(async (user) => {
    const userChat = await prismaRO.userChat.findUnique({
      where: {
        userId: user.id,
        token,
        kind: {
          in: ["universal", "study"],
        },
      },
    });

    if (!userChat) {
      return {
        success: false,
        message: "UserChat not found",
        code: "not_found",
      };
    }

    // Load messages
    const dbMessages = await prismaRO.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: { id: "asc" },
    });

    const messages = await convertDBMessagesToAIMessages(dbMessages);

    return {
      success: true,
      data: {
        ...userChat,
        kind: userChat.kind as "universal" | "study",
        extra: userChat.extra as UserChatExtra,
        messages,
      },
    };
  });
}
