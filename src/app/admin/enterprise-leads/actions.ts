"use server";

import { AdminPermission, checkAdminAuth } from "@/app/admin/utils";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { User, UserChat } from "@prisma/client";

// Fetch enterprise leads with pagination
export async function fetchEnterpriseLeads(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<(UserChat & { user: Pick<User, "id" | "email"> })[]>> {
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
    data: leads,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
