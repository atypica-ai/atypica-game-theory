"use server";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { createStudyUserChat } from "@/app/(study)/study/actions";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChat, UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";
import { getTranslations } from "next-intl/server";

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

    const extra = userChat.extra as UserChatExtra;
    if (extra?.newStudyUserChatToken && typeof extra.newStudyUserChatToken === "string") {
      return { success: true, data: { token: extra.newStudyUserChatToken } };
    }

    // Since we are creating a new study, the initial message should be from the 'user'
    const createResult = await createStudyUserChat(
      { role: "user", content: studyBrief },
      { briefUserChatId: userChat.id },
    );

    if (!createResult.success) {
      return createResult;
    }

    const newStudyChat = createResult.data;

    // 使用 || 操作符安全地更新 extra 字段，避免覆盖其他值
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
        newStudyUserChatId: newStudyChat.id,
        newStudyUserChatToken: newStudyChat.token,
      })}::jsonb
      WHERE "id" = ${userChatId}
    `;

    return { success: true, data: { token: newStudyChat.token } };
  });
}
