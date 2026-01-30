"use server";
import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChat, type UserChatKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId, UIMessage } from "ai";

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
    const message: UIMessage = {
      id: generateId(),
      role,
      parts: [{ type: "text", text: content }],
    };
    const userChat = await createUserChat({
      userId: user.id,
      title: truncateForTitle(content, {
        maxDisplayWidth: 50,
        suffix: "...",
      }),
      kind: "scout",
    });
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: userChat.id,
      message,
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
