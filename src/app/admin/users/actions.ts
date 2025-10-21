"use server";
import { generateImpersonationLoginUrl } from "@/app/(auth)/impersonationLogin";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { encryptText } from "@/lib/cipher";
import { getRequestOrigin } from "@/lib/request/headers";
import { ServerActionResult } from "@/lib/serverAction";
import {
  AdminRole,
  Currency,
  User,
  UserLastLogin,
  UserOnboardingData,
  UserProfileExtra,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export async function fetchUsers(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  adminOnly?: boolean,
): Promise<
  ServerActionResult<
    (Pick<User, "id" | "name" | "email" | "createdAt" | "emailVerified"> & {
      tokensAccount: { permanentBalance: number; monthlyBalance: number } | null;
      paymentRecords: { id: number; amount: number; currency: Currency }[];
      adminUser: { role: AdminRole; permissions: AdminPermission[] } | null;
      profile: {
        lastLogin: UserLastLogin;
        onboarding: UserOnboardingData;
        extra: UserProfileExtra;
      } | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);
  const skip = (page - 1) * pageSize;

  // Build the where condition based on search query and admin filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Add search condition if provided
  if (searchQuery) {
    where.OR = [
      { email: { contains: searchQuery } },
      // { name: { contains: searchQuery } },
    ];
  }

  // Add admin filter if requested
  if (adminOnly) {
    where.adminUser = { isNot: null };
  }

  // filter out team users
  // where.personalUserId = { equals: null };  被删除以后 personalUserId 会不存在，但是 teamId 一定会有
  where.teamIdAsMember = { equals: null };

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
        profile: true,
        tokensAccount: {
          select: {
            permanentBalance: true,
            monthlyBalance: true,
          },
        },
        paymentRecords: {
          where: { status: "succeeded" },
          select: {
            id: true,
            amount: true,
            currency: true,
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
      profile: user.profile
        ? {
            lastLogin: user.profile.lastLogin as UserLastLogin,
            onboarding: user.profile.onboarding as UserOnboardingData,
            extra: user.profile.extra as UserProfileExtra,
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

export async function addTokensToUser(
  userId: number,
  tokens: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (tokens <= 0) {
    return {
      success: false,
      message: "Tokens must be a positive number",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tokensAccount: true },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  await prisma.$transaction(async (tx) => {
    // Create tokensAccount if they don't exist
    await tx.tokensAccount.update({
      where: { userId: user.id },
      data: {
        permanentBalance: { increment: tokens },
      },
    });
    // Create a log entry
    await tx.tokensLog.create({
      data: {
        userId: user.id,
        value: tokens,
        verb: "gift", // Using "gift" as the verb for admin-added tokens
      },
    });
  });

  revalidatePath("/admin/users");

  return {
    success: true,
    data: undefined,
  };
}
export async function verifyUserEmail(userId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: new Date(),
    },
  });

  revalidatePath("/admin/users");

  return {
    success: true,
    data: undefined,
  };
}

export async function deleteUserAccount(userId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      analysts: true,
      userChats: true,
      paymentRecords: true,
      tokensAccount: true,
      tokensLogs: true,
      subscriptions: true,
    },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  if (
    user.analysts.length > 0 ||
    user.userChats.length > 0 ||
    user.paymentRecords.length > 0 ||
    user.tokensLogs.length > 1 ||
    user.subscriptions.length > 0
  ) {
    return {
      success: false,
      message: "User has associated data that prevents deletion.",
    };
  }

  try {
    await prisma.tokensAccount.delete({
      where: { userId },
    });
    await prisma.tokensLog.deleteMany({
      where: { userId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath("/admin/users");
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: "Failed to delete user. The user may have associated data that prevents deletion.",
    };
  }
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

export async function generateImpersonationLoginForUser(
  userId: number,
  expiryHours: number = 24,
): Promise<ServerActionResult<string>> {
  // Only super admins can generate impersonation login tokens
  await checkAdminAuth("SUPER_ADMIN");

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  if (!user.emailVerified) {
    return {
      success: false,
      message: "User email is not verified",
    };
  }

  // Get the base URL from environment or construct it
  const siteOrigin = await getRequestOrigin();

  try {
    const loginUrl = generateImpersonationLoginUrl(userId, siteOrigin, expiryHours);
    return {
      success: true,
      data: loginUrl,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Failed to generate login token",
    };
  }
}

export async function generatePasswordResetLinkForUser(
  userId: number,
  expiryHours: number = 0.5,
): Promise<ServerActionResult<string>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  // Create reset token payload with email and expiry
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * expiryHours); // Default 30 minutes
  const payload = JSON.stringify({
    email: user.email,
    expiresAt: expiresAt.toISOString(),
  });

  // Encrypt the payload as the reset token
  const resetToken = encryptText(payload);

  // Create reset URL
  const siteOrigin = await getRequestOrigin();
  const resetUrl = `${siteOrigin}/auth/reset-password?token=${resetToken}`;

  return {
    success: true,
    data: resetUrl,
  };
}
