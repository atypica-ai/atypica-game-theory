"use server";

import type { SageActivity, SageStats } from "./types";
import { fetchSageActivities } from "./lib/activities";
import { fetchSageStats } from "./lib/stats";
import type {
  SageAvatar,
  SageExtra,
  SageInterviewExtra,
  SageSourceContent,
  SageSourceExtra,
} from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { Sage, SageInterview, SageSource, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";
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

/**
 * Get complete sage data by token for layout
 * Includes auth check and type conversion
 */
export async function getSageByTokenAction(sageToken: string): Promise<
  ServerActionResult<
    Omit<Sage, "extra" | "expertise" | "avatar"> & {
      extra: SageExtra;
      expertise: string[];
      avatar: SageAvatar;
    }
  >
> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    return {
      success: true,
      data: {
        ...sage,
        extra: sage.extra as SageExtra,
        expertise: sage.expertise as string[],
        avatar: sage.avatar as SageAvatar,
      },
    };
  });
}

export async function fetchSageSourcesByTokenAction(sageToken: string): Promise<
  ServerActionResult<
    Array<
      Pick<SageSource, "id" | "title"> & {
        extractedTextDigest: string;
        content: SageSourceContent;
        extra: SageSourceExtra;
      }
    >
  >
> {
  return withAuth(async (user) => {
    const sources = (
      await prisma.sageSource.findMany({
        where: {
          sage: {
            token: sageToken,
            userId: user.id, // ensure user owns the sage
          },
        },
        select: {
          id: true,
          title: true,
          content: true,
          extractedText: true,
          extra: true,
        },
        orderBy: { id: "desc" },
      })
    ).map(({ content, extra, extractedText, ...source }) => ({
      ...source,
      extractedTextDigest: extractedText.slice(0, 100),
      content: content as SageSourceContent,
      extra: extra as SageSourceExtra,
    }));

    return {
      success: true,
      data: sources,
    };
  });
}

/**
 * Fetch sage statistics
 */
export async function fetchSageStatsAction(
  sageToken: string,
): Promise<ServerActionResult<SageStats>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
      select: { id: true },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const stats = await fetchSageStats(sage.id);

    return {
      success: true,
      data: stats,
    };
  });
}

/**
 * Fetch activity feed for sage
 */
export async function fetchSageActivitiesAction(
  sageToken: string,
): Promise<ServerActionResult<SageActivity[]>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
      select: { id: true },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const locale = await getLocale();
    const activities = await fetchSageActivities({
      sageId: sage.id,
      sageToken,
      limit: 20,
      locale,
    });

    return {
      success: true,
      data: activities,
    };
  });
}

/**
 * Update sage profile information
 */
export async function updateSageProfileAction(
  sageId: number,
  data: {
    name?: string;
    domain?: string;
    bio?: string;
    expertise?: string[];
    locale?: "zh-CN" | "en-US";
  },
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { id: sageId },
      select: { userId: true, token: true },
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
      data,
    });

    revalidatePath(`/sage/${sage.token}`);
    revalidatePath(`/sage/profile/${sage.token}`);

    return { success: true, data: undefined };
  });
}
