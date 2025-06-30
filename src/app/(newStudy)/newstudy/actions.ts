"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChat } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";

export async function createNewStudyChat(): Promise<
  ServerActionResult<Omit<UserChat, "kind"> & { kind: "misc" }>
> {
  return withAuth(async (user) => {
    const content = "[READY]";
    const parts = [{ type: "text", text: content }];
    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: "New Study Planning",
        kind: "misc",
        tx,
      });

      await tx.chatMessage.create({
        data: {
          messageId: generateId(),
          userChatId: userChat.id,
          role: "user",
          content,
          parts: parts as InputJsonValue,
        },
      });
      return userChat;
    });

    return {
      success: true,
      data: {
        ...userChat,
        kind: "misc",
      },
    };
  });
}

export async function fetchMiscUserChat(token: string): Promise<ServerActionResult<UserChat>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token, userId: user.id, kind: "misc" },
    });

    if (!userChat) {
      return {
        success: false,
        code: "not_found",
        message: "UserChat not found or access denied",
      };
    }

    return {
      success: true,
      data: userChat,
    };
  });
}
