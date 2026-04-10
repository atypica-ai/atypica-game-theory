"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

export async function getCurrentUser(): Promise<
  ServerActionResult<{ id: number; name: string; email: string | null }>
> {
  return withAuth(async (user) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true },
    });

    if (!currentUser) {
      return { success: false, message: "User not found." };
    }

    return { success: true, data: currentUser };
  });
}

const nameSchema = z.object({
  name: z.string().min(2).max(64),
});

export async function updateName(
  values: z.infer<typeof nameSchema>,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const parsed = nameSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, message: "Name must be 2–64 characters." };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });
    return { success: true, data: undefined };
  });
}

const passwordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  values: z.infer<typeof passwordSchema>,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }
    const hashedPassword = await hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    return { success: true, data: undefined };
  });
}
