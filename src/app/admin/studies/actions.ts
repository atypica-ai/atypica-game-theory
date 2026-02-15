"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { AnalystKind } from "@/app/(study)/context/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { generateChatTitle } from "@/lib/userChat/lib";
import { User, UserChat } from "@/prisma/client";
import { UserChatWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { after } from "next/server";

// Get all analysts
export async function fetchStudies(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
  kind?: AnalystKind | "all",
): Promise<
  ServerActionResult<
    (Pick<UserChat, "id" | "token" | "title" | "extra" | "context" | "createdAt"> & {
      user: Pick<User, "email">;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: UserChatWhereInput = {
    kind: "study",
  };

  // Add search filter
  if (search) {
    where.OR = [
      {
        context: {
          path: ["studyTopic"],
          string_contains: search,
          mode: "insensitive",
        },
      },
      { title: { contains: search, mode: "insensitive" } },
      { user: { email: search } },
      { token: search },
    ];
  }

  // Add kind filter
  if (kind && kind !== "all") {
    where.context = {
      path: ["analystKind"],
      equals: kind,
    };
  }

  const studyUserChats = await prisma.userChat.findMany({
    where,
    select: {
      id: true,
      token: true,
      title: true,
      extra: true,
      context: true,
      createdAt: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.userChat.count({ where });

  // Step 4: Combine data
  return {
    success: true,
    data: studyUserChats,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function generateChatTitleAction(
  userChatId: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  after(generateChatTitle(userChatId));

  return {
    success: true,
    data: undefined,
  };
}

// Fetch brief chat messages by chat ID
export async function fetchBriefChatMessages(
  briefUserChatToken: string,
): Promise<ServerActionResult<UIMessage[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const briefChat = await prisma.userChat.findUnique({
    where: { token: briefUserChatToken },
    include: {
      messages: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!briefChat) {
    return {
      success: false,
      message: "Brief chat not found",
    };
  }

  return {
    success: true,
    data: briefChat.messages.map(convertDBMessageToAIMessage),
  };
}
