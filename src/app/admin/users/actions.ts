"use server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "../utils";

export async function fetchUsers(page: number = 1, pageSize: number = 10, searchQuery?: string) {
  await checkAdminAuth();
  const skip = (page - 1) * pageSize;
  // Build the where condition based on search query
  const where = searchQuery
    ? {
        OR: [
          { email: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
