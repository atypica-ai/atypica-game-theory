"use server";

import { AdminPermission, checkAdminAuth } from "@/app/admin/utils";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { User, UserChat } from "@prisma/client";
import { Message } from "ai";

// Fetch enterprise leads with pagination
export async function fetchEnterpriseLeads(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (UserChat & {
      user: Pick<User, "id" | "email">;
      messages: Message[];
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.VIEW_ENTERPRISE_LEADS]);

  const skip = (page - 1) * pageSize;

  const leads = await prisma.userChat.findMany({
    where: {
      title: {
        contains: "企业用户",
      },
      kind: "study",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      messages: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.userChat.count({
    where: {
      title: {
        contains: "企业用户",
      },
      kind: "study",
    },
  });

  return {
    success: true,
    data: leads.map((lead) => ({
      ...lead,
      messages: lead.messages.map(convertDBMessageToAIMessage),
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
