"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import { UserChat } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId, Message } from "ai";

export async function createHelloUserChatAction({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "misc" }>> {
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
        kind: "misc",
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
        kind: "misc",
        messages: [message],
      },
    };
  });
}
