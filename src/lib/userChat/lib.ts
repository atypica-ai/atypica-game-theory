import "server-only";

import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { generateToken } from "@/lib/utils";
import { UserChat, UserChatExtra, UserChatKind } from "@/prisma/client";
import { ITXClientDenyList } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";

export async function createUserChat<TKind extends UserChatKind>({
  userId,
  kind,
  token,
  title,
  tx,
  extra: _extra,
}: {
  userId: number;
  kind: TKind;
  token?: string;
  title: string;
  tx?: Omit<typeof prisma, ITXClientDenyList>;
  extra?: Record<string, string | number>;
}): Promise<Omit<UserChat, "kind" | "extra"> & { kind: TKind; extra: UserChatExtra }> {
  if (!tx) {
    tx = prisma;
  }
  const [clientIp, userAgent, geo] = await Promise.all([
    getRequestClientIp(),
    getRequestUserAgent(),
    getRequestGeo(),
  ]);
  const locale = await getLocale();
  if (!token) {
    token = generateToken();
  }
  const extra = {
    ..._extra,
    ...{ clientIp, userAgent, geo, locale }, // 发起 chat 时候的客户端信息，不用于后续逻辑判断
  };
  const userChat = await tx.userChat.create({
    data: { userId, title, kind, token, extra },
  });
  return {
    ...userChat,
    kind,
    extra: userChat.extra as UserChatExtra,
  };
}

/**
 * 设置或删除 UserChat 的错误信息到 extra.error 字段
 * 使用 PostgreSQL JSON 操作符直接更新，避免并发问题
 * @param userChatId - UserChat ID
 * @param error - 错误信息，如果为 null 则删除 error 字段
 */
export async function setUserChatError(userChatId: number, error: string | null) {
  if (error === null) {
    // 删除 error 字段
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') - 'error',
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
    `;
  } else {
    // 设置 error 字段
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') || ${{ error }}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
    `;
  }
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
