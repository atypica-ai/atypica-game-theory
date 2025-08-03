"use server";
import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { createPersonalUser } from "@/app/(auth)/lib";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";

export async function signUp({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ServerActionResult<{ id: number; email: string }>> {
  const t = await getTranslations("Auth.SignUp");

  email = email.toLowerCase();

  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    return {
      success: false,
      message: t("userAlreadyExists"),
    };
  }

  const user = await createPersonalUser({ email, password });

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
