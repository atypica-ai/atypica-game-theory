"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { generateChatTitle } from "@/lib/userChat/lib";
import { Analyst, AnalystKind, User, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { after } from "next/server";

// Get all analysts
export async function fetchAnalysts(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
  kind?: AnalystKind | "all",
): Promise<
  ServerActionResult<
    (Analyst & {
      user: Pick<User, "email"> | null;
      studyUserChat: Pick<UserChat, "token" | "title" | "extra" | "context"> | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: {
    topic: { not: string };
    OR?: Array<{
      topic?: { contains: string };
      brief?: { contains: string };
      user?: { email: { contains: string } };
      studyUserChat?: { token: { contains: string } };
    }>;
    kind?: AnalystKind;
  } = {
    topic: { not: "" },
  };

  // Add search filter
  if (search) {
    where.OR = [
      { topic: { contains: search } },
      { brief: { contains: search } },
      {
        user: {
          email: { contains: search },
        },
      },
      {
        studyUserChat: {
          token: { contains: search },
        },
      },
    ];
  }

  // Add kind filter
  if (kind && kind !== "all") {
    where.kind = kind;
  }

  // Step 1: Get main analyst data without nested collections
  const analysts = await prisma.analyst.findMany({
    where,
    include: {
      studyUserChat: {
        select: {
          token: true,
          title: true,
          extra: true,
          context: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.analyst.count({ where });

  // Step 4: Combine data
  return {
    success: true,
    data: analysts,
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
  briefUserChatId: number,
): Promise<ServerActionResult<UIMessage[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const briefChat = await prisma.userChat.findUnique({
    where: { id: briefUserChatId },
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
