"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import withAuth from "@/lib/withAuth";
import { UserChat as UserChatPrisma } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { generateId, Message } from "ai";

export type UserChat = Omit<UserChatPrisma, "messages"> & {
  messages: Message[];
};

export type ScoutUserChat = Omit<UserChat, "kind"> & {
  kind: "scout";
};

export type StudyUserChat = Omit<UserChat, "kind"> & {
  kind: "study";
};

export async function updateUserChat(
  chatId: number,
  messages: Message[],
): Promise<ServerActionResult<UserChat>> {
  if (messages.length < 2) {
    // AI 回复了再保存
    return {
      success: false,
      message: "No messages provided",
    };
  }
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.update({
      where: {
        id: chatId,
        userId: user.id,
      },
      data: { messages: messages as unknown as InputJsonValue },
    });
    return {
      success: true,
      data: {
        ...userChat,
        kind: userChat.kind,
        messages: userChat.messages as unknown as Message[],
      },
    };
  });
}

export async function createUserChat<TKind extends UserChat["kind"]>(
  kind: TKind,
  message: Pick<Message, "role" | "content">,
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: TKind }>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.create({
      data: {
        userId: user.id,
        title: message.content.substring(0, 50),
        kind,
        token: generateToken(),
        messages: [{ id: generateId(), ...message }],
      },
    });
    return {
      success: true,
      data: {
        ...userChat,
        kind: userChat.kind as TKind,
        messages: userChat.messages as unknown as Message[],
      },
    };
  });
}

export async function fetchUserChats<Tkind extends UserChat["kind"]>(
  kind: Tkind,
  { take = 30 }: { take?: number } = {},
): Promise<
  ServerActionResult<
    (Omit<UserChat, "kind" | "messages"> & {
      kind: Tkind;
    })[]
  >
> {
  return withAuth(async (user) => {
    const userChats = await prisma.userChat.findMany({
      where: {
        userId: user.id,
        kind,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        token: true,
        userId: true,
        title: true,
        kind: true,
        backgroundToken: true,
        createdAt: true,
        updatedAt: true,
        messages: false,
      },
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

export async function clearStudyUserChatBackgroundToken(
  studyUserChatId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    await prisma.userChat.update({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
      data: { backgroundToken: null },
    });
    return {
      success: true,
      data: undefined,
    };
  });
}

export async function fetchUserChatById<Tkind extends UserChat["kind"]>(
  userChatId: number,
  kind: Tkind,
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: Tkind }>> {
  return withAuth(async (user) => {
    // Make sure all fields in UserChat are set to true or false in select
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId, kind },
    });
    if (!userChat) {
      return {
        success: false,
        code: "not_found",
        message: "UserChat not found",
      };
    }
    if (userChat.userId != user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "UserChat does not belong to the current user",
      };
    }
    return {
      success: true,
      data: {
        ...userChat,
        kind: userChat.kind as Tkind,
        messages: userChat.messages as unknown as Message[],
      },
    };
  });
}

export async function deleteMessageFromUserChat(
  userChatId: number,
  messages: Message[],
  messageId: string,
): Promise<ServerActionResult<Message[]>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId },
    });
    if (userChat?.userId != user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "UserChat does not belong to the current user",
      };
    }
    const newMessages = [...messages];
    const index = newMessages.findIndex((message) => message.id === messageId);
    if (index >= 0 && newMessages[index].role === "user") {
      if (newMessages[index + 1]?.role === "assistant") {
        newMessages.splice(index, 2);
      } else {
        newMessages.splice(index, 1);
      }
    }
    await prisma.userChat.update({
      where: { id: userChatId },
      data: { messages: newMessages as unknown as InputJsonValue },
    });
    return {
      success: true,
      data: newMessages,
    };
  });
}
