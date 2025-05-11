"use server";
import { sendVerificationEmail } from "@/email/verification";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";

/**
 * Generates a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const sendVerificationCode = async (userEmail: string) => {
  const verificationCode = generateVerificationCode();

  await prisma.verificationCode.create({
    data: {
      email: userEmail,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
    },
  });

  await sendVerificationEmail({
    email: userEmail,
    verificationCode,
  });
};

export async function verifyCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<ServerActionResult<null>> {
  const t = await getTranslations("Auth.Verify");
  if (!email || !code) {
    throw new Error("Email and verification code are required");
  }
  email = email.toLowerCase();

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    return {
      success: false,
      message: t("userNotFound"),
    };
  }
  if (user.emailVerified) {
    return {
      success: false,
      message: t("alreadyVerifiedMessage"),
    };
  }

  // Find the verification code
  const verificationCodeRecord = await prisma.verificationCode.findFirst({
    where: {
      email,
      code,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!verificationCodeRecord) {
    return {
      success: false,
      message: t("invalidCode"),
    };
  }

  // Mark the user's email as verified
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Delete all verification codes for this user
  await prisma.verificationCode.deleteMany({
    where: { email },
  });

  return {
    success: true,
    data: null,
  };
}

export async function resendVerificationCode(email: string): Promise<ServerActionResult<null>> {
  const t = await getTranslations("Auth.Verify");
  if (!email) {
    return {
      success: false,
      message: "Email is required",
    };
  }
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    return {
      success: false,
      message: t("userNotFound"),
    };
  }
  await sendVerificationCode(email);
  return {
    success: true,
    data: null,
  };
}
