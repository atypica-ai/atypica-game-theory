"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";

export async function fetchUserChatByIdAction<Tkind extends UserChat["kind"]>(
  userChatId: number,
  kind: Tkind,
): Promise<
  ServerActionResult<
    Omit<UserChat, "kind"> & {
      kind: Tkind;
      messages: UIMessage[];
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
