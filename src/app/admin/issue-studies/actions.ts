"use server";
import { studyAgentRequest } from "@/app/api/chat/study/studyAgentRequest";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { User, UserChat } from "@prisma/client";
import { Message } from "ai";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";

// Fetch studies that might be having issues (have an active backgroundToken)
export async function fetchIssueStudies(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (UserChat & {
      user: Pick<User, "id" | "email">;
    })[]
  >
> {
  // Only Super Admins can access this page
  await checkAdminAuth("SUPER_ADMIN");

  const skip = (page - 1) * pageSize;

  // Find UserChats that have backgroundToken (meaning they're in progress)
  const studies = await prisma.userChat.findMany({
    where: {
      kind: "study",
      backgroundToken: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: [
      { backgroundToken: "desc" }, // Show newest first
    ],
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.userChat.count({
    where: {
      kind: "study",
      backgroundToken: {
        not: null,
      },
    },
  });

  return {
    success: true,
    data: studies,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Retry a stuck study
export async function retryStudy(studyUserChatId: number): Promise<ServerActionResult<void>> {
  // Only Super Admins can perform this action
  await checkAdminAuth("SUPER_ADMIN");

  try {
    // Get the study details
    const study = await prisma.userChat.findUnique({
      where: { id: studyUserChatId },
      include: {
        user: true,
      },
    });

    if (!study) {
      return {
        success: false,
        message: "Study not found",
      };
    }

    // Get the current messages
    const messages = study.messages as unknown as Message[];

    // Clear the backgroundToken to allow a new study to start
    await prisma.userChat.update({
      where: { id: studyUserChatId },
      data: { backgroundToken: null },
    });

    // Start the study agent request in the background
    studyAgentRequest({
      studyUserChatId,
      initialMessages: messages,
      userId: study.userId,
      reqSignal: null,
    });

    revalidatePath("/admin/issue-studies");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Error retrying study:", error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}
