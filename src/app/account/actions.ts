"use server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { UserTokensLog } from "@prisma/client";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

export async function fetchTokensHistory(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<UserTokensLog[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const userId = session.user.id;
  const skip = (page - 1) * pageSize;

  const [tokensLogs, totalCount] = await Promise.all([
    prisma.userTokensLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: skip,
    }),
    prisma.userTokensLog.count({
      where: { userId },
    }),
  ]);

  return {
    success: true,
    data: tokensLogs,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
