"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { hash } from "bcryptjs";
import { z } from "zod/v3";

const nameFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

export async function updateName(
  values: z.infer<typeof nameFormSchema>,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Get user with personalUserId field
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, personalUserId: true },
    });

    if (!currentUser) {
      return { success: false, message: "User not found." };
    }

    // 检查是否是 AWS Marketplace 用户
    const personalUserId = currentUser.personalUserId || currentUser.id;
    const awsUser = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { userId: personalUserId },
      select: { id: true },
    });

    if (awsUser) {
      return { success: false, message: "AWS Marketplace users cannot change their name." };
    }

    try {
      // Validate input using the schema
      const validatedData = nameFormSchema.parse(values);
      await prisma.user.update({
        where: { id: user.id },
        data: { name: validatedData.name },
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });
}

const passwordFormSchema = z
  .object({
    newPassword: z.string().min(8, {
      message: "New password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  values: z.infer<typeof passwordFormSchema>,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Get user with personalUserId field
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, personalUserId: true },
    });

    if (!currentUser) {
      return { success: false, message: "User not found." };
    }

    // 检查是否是 AWS Marketplace 用户
    const personalUserId = currentUser.personalUserId || currentUser.id;
    const awsUser = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { userId: personalUserId },
      select: { id: true },
    });

    if (awsUser) {
      return { success: false, message: "AWS Marketplace users cannot change their password." };
    }

    try {
      // Validate input using the schema
      const validatedData = passwordFormSchema.parse(values);
      const hashedPassword = await hash(validatedData.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });
}

export async function getCurrentUser(): Promise<
  ServerActionResult<Pick<User, "id" | "name" | "email"> & { isAwsUser: boolean }>
> {
  return withAuth(async (user) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        personalUserId: true,
      },
    });

    if (!currentUser) {
      return { success: false, message: "User not found." };
    }

    // 检查是否是 AWS Marketplace 用户
    const personalUserId = currentUser.personalUserId || currentUser.id;
    const awsUser = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { userId: personalUserId },
      select: { id: true },
    });

    return {
      success: true,
      data: {
        ...currentUser,
        isAwsUser: !!awsUser
      }
    };
  });
}
