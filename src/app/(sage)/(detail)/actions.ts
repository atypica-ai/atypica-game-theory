"use server";
import type { SageInterviewExtra } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { SageInterview, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

/**
 * Create a supplementary interview to fill knowledge gaps
 * Interview will dynamically fetch gaps when the conversation starts
 */
export async function createSageInterviewAction(sageId: number): Promise<
  ServerActionResult<{
    interview: SageInterview;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUniqueOrThrow({
      where: {
        id: sageId,
        userId: user.id,
      },
      select: {
        name: true,
      },
    });

    // Create UserChat and Interview
    const { interview, userChat } = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Interview: ${sage.name}`,
        tx,
      });
      const interview = await tx.sageInterview.create({
        data: {
          sageId,
          userChatId: userChat.id,
          extra: {
            startsAt: Date.now(),
            ongoing: true,
          } as SageInterviewExtra,
        },
      });
      return { interview, userChat };
    });

    rootLogger.info({
      msg: "Created supplementary interview",
      interviewId: interview.id,
      sageId,
    });

    return {
      success: true,
      data: { interview, userChat },
    };
  });
}

/**
 * Update sage avatar
 */
export async function updateSageAvatar(
  sageId: number,
  avatarUrl: string,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Check ownership and get token for revalidation
    const sage = await prisma.sage.findUnique({
      where: { id: sageId },
      select: {
        userId: true,
        token: true,
      },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    await prisma.sage.update({
      where: { id: sageId },
      data: {
        avatar: { url: avatarUrl },
      },
    });

    revalidatePath(`/sage/${sage.token}`);
    revalidatePath(`/sage/profile/${sage.token}`);

    return { success: true, data: undefined };
  });
}
