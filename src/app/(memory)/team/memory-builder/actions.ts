"use server";

import authOptions from "@/app/(auth)/authOptions";
import { createUserChat } from "@/lib/userChat/lib";
import type { ServerActionResult } from "@/lib/serverAction";
import { getServerSession } from "next-auth";
import { prisma } from "@/prisma/prisma";

export async function createContextBuilderChat(): Promise<
  ServerActionResult<{ userChatToken: string }>
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized",
      code: "unauthorized",
    };
  }

  if (session.userType !== "TeamMember" || !session.team) {
    return { success: false, message: "Only team owners can use this feature", code: "forbidden" };
  }
  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: session.team.id }, select: { ownerUserId: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { personalUserId: true } }),
  ]);
  if (!team || !user || team.ownerUserId !== user.personalUserId) {
    return { success: false, message: "Only team owners can use this feature", code: "forbidden" };
  }

  try {
    const userChat = await createUserChat({
      userId: session.user.id,
      title: "Team Context Interview",
      kind: "misc",
    });

    return {
      success: true,
      data: {
        userChatToken: userChat.token,
      },
    };
  } catch (error) {
    console.error("Failed to create context builder chat:", error);
    return {
      success: false,
      message: "Failed to create chat",
      code: "internal_server_error",
    };
  }
}
