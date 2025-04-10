"use server";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import withAuth from "@/lib/withAuth";
import { UserChat as UserChatPrisma } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { generateId, Message } from "ai";

export type UserChat = Omit<UserChatPrisma, "messages"> & {
  // readonly field from ChatMessage table
  messages: Message[];
};

export type ScoutUserChat = Omit<UserChat, "kind"> & {
  kind: "scout";
};

export type StudyUserChat = Omit<UserChat, "kind"> & {
  kind: "study";
};

export async function createUserChat<TKind extends UserChat["kind"]>(
  kind: TKind,
  { role, content }: { role: "user" | "assistant"; content: string },
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: TKind }>> {
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
        kind,
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
        kind: userChat.kind as TKind,
        messages: [message],
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
): Promise<
  ServerActionResult<
    Omit<UserChat, "kind"> & {
      kind: Tkind;
      messages: Message[];
    }
  >
> {
  return withAuth(async (user) => {
    // Make sure all fields in UserChat are set to true or false in select
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId, kind },
      include: {
        messages: { orderBy: { id: "asc" } },
      },
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
        messages: userChat.messages.map(convertDBMessageToAIMessage),
      },
    };
  });
}

// export async function deleteMessageFromUserChat(
//   userChatId: number,
//   messageId: string,
// ): Promise<ServerActionResult<Message[]>> {
//   return withAuth(async (user) => {
//     const userChat = await prisma.userChat.findUnique({
//       where: { id: userChatId },
//     });
//     if (userChat?.userId != user.id) {
//       return {
//         success: false,
//         code: "forbidden",
//         message: "UserChat does not belong to the current user",
//       };
//     }
//     const newMessages = [...messages];
//     const index = newMessages.findIndex((message) => message.id === messageId);
//     if (index >= 0 && newMessages[index].role === "user") {
//       if (newMessages[index + 1]?.role === "assistant") {
//         newMessages.splice(index, 2);
//       } else {
//         newMessages.splice(index, 1);
//       }
//     }
//     await prisma.userChat.update({
//       where: { id: userChatId },
//       data: { messages: newMessages as unknown as InputJsonValue },
//     });
//     return {
//       success: true,
//       data: newMessages,
//     };
//   });
// }
