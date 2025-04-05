"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";

export async function fetchUsers(page: number = 1, pageSize: number = 10, searchQuery?: string) {
  await checkAdminAuth();
  const skip = (page - 1) * pageSize;
  // Build the where condition based on search query
  const where = searchQuery
    ? {
        OR: [
          { email: { contains: searchQuery } },
          // { name: { contains: searchQuery } },
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
        points: {
          select: {
            balance: true,
          },
        },
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

export async function addPointsToUser(userId: number, points: number) {
  await checkAdminAuth();

  if (points <= 0) {
    throw new Error("Points must be a positive number");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { points: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await prisma.$transaction(async (tx) => {
    // Create user points if they don't exist
    if (!user.points) {
      await tx.userPoints.create({
        data: {
          userId: user.id,
          balance: points,
        },
      });
    } else {
      // Update existing points
      await tx.userPoints.update({
        where: { userId: user.id },
        data: {
          balance: { increment: points },
        },
      });
    }

    // Create a log entry
    await tx.userPointsLog.create({
      data: {
        userId: user.id,
        points: points,
        verb: "gift", // Using "gift" as the verb for admin-added points
      },
    });
  });

  revalidatePath("/admin/users");
}
