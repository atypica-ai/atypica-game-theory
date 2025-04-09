"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { AdminRole, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AdminPermission, checkAdminAuth } from "../utils";

export async function fetchUsers(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
): Promise<
  ServerActionResult<
    (Pick<User, "id" | "email" | "createdAt"> & {
      points: { balance: number } | null;
      adminUser: { role: AdminRole; permissions: AdminPermission[] } | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);
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
        adminUser: {
          select: {
            role: true,
            permissions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: users.map((user) => ({
      ...user,
      adminUser: user.adminUser
        ? {
            ...user.adminUser,
            permissions: user.adminUser.permissions as AdminPermission[],
          }
        : null,
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function addPointsToUser(
  userId: number,
  points: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (points <= 0) {
    return {
      success: false,
      message: "Points must be a positive number",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { points: true },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
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

  return {
    success: true,
    data: undefined,
  };
}

export async function updateAdminStatus(
  userId: number,
  isAdmin: boolean,
  role?: AdminRole,
  permissions?: AdminPermission[],
): Promise<ServerActionResult<void>> {
  // Only super admins can manage other admins
  await checkAdminAuth("SUPER_ADMIN");

  // Update or create admin status
  if (isAdmin) {
    if (!role || !permissions) {
      throw new Error("Role and permissions are required");
    }
    await prisma.adminUser.upsert({
      where: { userId },
      update: {
        role: role,
        permissions: permissions,
      },
      create: {
        userId,
        role: role,
        permissions: permissions,
      },
    });
  } else {
    // Remove admin status
    await prisma.adminUser
      .delete({
        where: { userId },
      })
      .catch(() => {
        // Ignore if not found
      });
  }

  revalidatePath("/admin/users");

  return {
    success: true,
    data: undefined,
  };
}
