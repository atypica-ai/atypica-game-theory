"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import { UserChat, type UserChatKind } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId, Message } from "ai";

export async function fetchUserChatsAction<Tkind extends UserChatKind>(
  kind: Tkind,
  { take = 30 }: { take?: number } = {},
): Promise<
  ServerActionResult<
    (Omit<UserChat, "kind"> & {
      kind: Tkind;
    })[]
  >
> {
  return withAuth(async (user) => {
    const userChats = await prisma.userChat.findMany({
      where: { userId: user.id, kind },
      orderBy: { updatedAt: "desc" },
      take,
    });
    return {
      success: true,
      data: userChats.map((chat) => {
        return {
          ...chat,
          kind: chat.kind as Tkind,
        };
      }),
    };
  });
}

export async function createScoutUserChatAction({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "scout" }>> {
  return withAuth(async (user) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      parts: [{ type: "text", text: content }],
    };
    const userChat = await prisma.userChat.create({
      data: {
        userId: user.id,
        title: message.content.substring(0, 50),
        kind: "scout",
        token: generateToken(),
      },
    });
    await prisma.chatMessage.create({
      data: {
        messageId: generateId(),
        userChatId: userChat.id,
        role,
        content,
        parts: message.parts as InputJsonValue,
      },
    });
    return {
      success: true,
      data: {
        ...userChat,
        kind: "scout",
        messages: [message],
      },
    };
  });
}
