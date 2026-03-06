"use server";
import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { UserChatContext } from "@/app/(study)/context/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import {
  ChatMessageAttachment,
  UserChatKind,
  type UserChat,
  type UserChatExtra,
} from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { createUniversalUserChat } from "../lib";

/**
 * Create new Universal chat (server action wrapper)
 */
export async function createUniversalUserChatAction(
  {
    role,
    content,
    attachments,
    context,
  }: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatMessageAttachment[];
    context?: UserChatContext;
  },
  extra?: UserChatExtra,
): Promise<
  ServerActionResult<Omit<UserChat, "kind"> & { kind: Extract<UserChatKind, "universal"> }>
> {
  return withAuth(async (user) => {
    try {
      const userChat = await createUniversalUserChat({
        userId: user.id,
        role,
        content,
        attachments,
        context,
        extra,
      });

      return {
        success: true,
        data: userChat,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: errorMessage,
      };
    }
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

export async function fetchUniversalUserChatsAction({
  take = 12,
}: {
  take?: number;
} = {}): Promise<
  ServerActionResult<
    Array<
      Pick<UserChat, "id" | "token" | "title" | "createdAt" | "updatedAt"> & {
        kind: Extract<UserChatKind, "universal">;
      }
    >
  >
> {
  return withAuth(async (user) => {
    const chats = await prismaRO.userChat.findMany({
      where: {
        userId: user.id,
        kind: "universal",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        token: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        kind: true,
      },
      take: Math.min(Math.max(take, 1), 30),
    });

    return {
      success: true,
      data: chats.map((chat) => ({
        ...chat,
        kind: chat.kind as "universal",
      })),
    };
  });
}
