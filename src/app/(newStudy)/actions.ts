"use server";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { createStudyUserChat } from "@/app/(study)/study/actions";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateId } from "ai";
import { getTranslations } from "next-intl/server";
import { UserChatContext } from "../(study)/context/types";
import { mergeUserChatContext } from "../(study)/context/utils";

export async function createNewStudyChat(): Promise<
  ServerActionResult<Omit<UserChat, "kind"> & { kind: "misc" }>
> {
  return withAuth(async (user) => {
    const t = await getTranslations("NewStudyChatPage");
    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: t("newStudyPlanningTitle"),
        kind: "misc",
        tx,
      });
      await persistentAIMessageToDB({
        mode: "append",
        userChatId: userChat.id,
        message: {
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: "[READY]" }],
        },
        tx,
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

export async function continueToStudyUserChat(
  userChatId: number,
  studyBrief: string,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const t = await getTranslations("NewStudyChatPage");
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId, userId: user.id },
    });

    if (!userChat) {
      return { success: false, message: t("chatNotFound") };
    }

    const userChatContext = userChat.context as UserChatContext;
    if (
      userChatContext?.newStudyUserChatToken &&
      typeof userChatContext.newStudyUserChatToken === "string"
    ) {
      return { success: true, data: { token: userChatContext.newStudyUserChatToken } };
    }

    // Since we are creating a new study, the initial message should be from the 'user'
    const createResult = await createStudyUserChat({ role: "user", content: studyBrief });
    if (!createResult.success) {
      return createResult;
    }

    const newStudyChat = createResult.data;
    await mergeUserChatContext({
      id: newStudyChat.id,
      context: {
        briefUserChatId: userChat.id,
      },
    });
    await mergeExtra({
      tableName: "UserChat",
      id: userChat.id,
      extra: {
        newStudyUserChatId: newStudyChat.id,
        newStudyUserChatToken: newStudyChat.token,
      },
    });

    return { success: true, data: { token: newStudyChat.token } };
  });
}

/**
 * Fetch chat titles by their tokens for displaying reference chats
 */
export async function fetchChatTitlesByTokens(
  tokens: string[],
): Promise<ServerActionResult<{ token: string; title: string }[]>> {
  return withAuth(async (user) => {
    if (!tokens || tokens.length === 0) {
      return { success: true, data: [] };
    }

    const chats = await prisma.userChat.findMany({
      where: {
        token: { in: tokens },
        userId: user.id, // Ensure user owns these chats
      },
      select: {
        token: true,
        title: true,
      },
    });

    return {
      success: true,
      data: chats,
    };
  });
}
