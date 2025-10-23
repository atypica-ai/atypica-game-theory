"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function fetchStudyFeedback(
  studyUserChatId: number,
): Promise<ServerActionResult<{ rating: "useful" | "not_useful"; submittedAt: string } | null>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
      select: { extra: true },
    });

    if (!userChat) {
      return {
        success: false,
        message: "Study not found or access denied",
      };
    }

    const extra = userChat.extra as UserChatExtra;
    const feedback = extra?.feedback as
      | { rating: "useful" | "not_useful"; submittedAt: string }
      | undefined;

    return {
      success: true,
      data: feedback || null,
    };
  });
}

export async function submitStudyFeedback(
  studyUserChatId: number,
  feedback: {
    rating: "useful" | "not_useful";
  },
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Check if user owns this study
    const userChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
    });

    if (!userChat) {
      return {
        success: false,
        message: "Study not found or access denied",
      };
    }

    // Store feedback in database (you may need to create a feedback table)
    // For now, we'll log it and store it as metadata in the userChat
    const feedbackData = {
      rating: feedback.rating,
      submittedAt: new Date().toISOString(),
    };

    // 使用 || 操作符安全地更新 extra 字段，避免覆盖其他值
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify(feedbackData)}::jsonb
      WHERE "id" = ${userChat.id}
    `;

    // await prisma.userChat.update({
    //   where: { id: studyUserChatId },
    //   data: {
    //     extra: {
    //       ...((userChat.extra as UserChatExtra) || {}),
    //       feedback: feedbackData,
    //     },
    //   },
    // });

    const logger = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });
    logger.info("Study feedback submitted", { feedback: feedbackData });

    return {
      success: true,
      data: undefined,
    };
  });
}
