"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra, UserChatKind } from "@/prisma/client";
import { prisma, prismaRO } from "@/prisma/prisma";
import { clearUserChatRun, parseRunStartedAt } from "./runtime";

export async function fetchUserChatStateByTokenAction<Tkind extends UserChatKind>({
  userChatToken,
  kind,
}: {
  userChatToken: string;
  kind: Tkind;
}): Promise<
  ServerActionResult<{ isRunning: boolean; startedAt: Date | null; chatMessageUpdatedAt: Date }>
> {
  return withAuth(async (user) => {
    const userChat = await prismaRO.userChat.findFirst({
      where: {
        token: userChatToken,
        kind,
        userId: user.id,
      },
      select: {
        extra: true,
        updatedAt: true,
        messages: {
          select: { updatedAt: true },
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });
    if (!userChat) {
      return { success: false, code: "not_found", message: "User chat not found" };
    }
    const extra = userChat.extra as UserChatExtra;
    const isRunning = !!extra?.runId;
    const startedAt = parseRunStartedAt(extra?.runId);
    const chatMessageUpdatedAt = userChat.messages[0]?.updatedAt ?? userChat.updatedAt;
    return { success: true, data: { isRunning, startedAt, chatMessageUpdatedAt } };
  });
}

export async function stopUserChatRunAction({
  userChatToken,
  kind,
}: {
  userChatToken: string;
  kind?: UserChatKind;
}): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: userChatToken,
        userId: user.id,
      },
      select: { id: true, kind: true },
    });
    if (!userChat) {
      return { success: false, code: "not_found", message: "User chat not found" };
    }
    if (kind && userChat.kind !== kind) {
      return { success: false, code: "forbidden", message: "Invalid user chat kind" };
    }
    await clearUserChatRun({ userChatId: userChat.id });
    return { success: true, data: undefined };
  });
}
