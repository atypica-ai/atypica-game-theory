"use server";
import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { createPersonalUser } from "@/app/(auth)/lib";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";

export async function signUp({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<ServerActionResult<{ id: number; email: string }>> {
  email = email.toLowerCase();

  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    return {
      success: false,
      message: "User already exists",
    };
  }

  const user = await createPersonalUser({ name, email, password });

  try {
    await sendVerificationCode(user.email);
  } catch {
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to send verification code",
    };
  }

  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
    },
  };
}
