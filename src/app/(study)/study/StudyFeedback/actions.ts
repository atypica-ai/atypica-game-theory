"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";

export async function fetchStudyFeedback(
  studyUserChatId: number,
): Promise<ServerActionResult<{ rating: "useful" | "not_useful"; submittedAt: string } | null>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: {
        id: studyUserChatId,
        userId: user.id,
        // kind: "study", // 因为有 universal agent, 现在不过滤了
      },
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
      where: {
        id: studyUserChatId,
        userId: user.id,
        // kind: "study", // 因为有 universal agent, 现在不过滤了
      },
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

    // 使用 mergeExtra 安全地更新 extra 字段，避免覆盖其他值
    await mergeExtra({
      tableName: "UserChat",
      extra: {
        feedback: feedbackData,
      } satisfies UserChatExtra,
      id: userChat.id,
    });

    const logger = rootLogger.child({ userChatId: studyUserChatId, userChatToken: userChat.token });
    logger.info({ msg: "Study feedback submitted", feedback: feedbackData });

    return {
      success: true,
      data: undefined,
    };
  });
}
