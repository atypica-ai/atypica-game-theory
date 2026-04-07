"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { sendVerificationCode } from "./lib";

export async function verifyCodeAction({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<ServerActionResult<null>> {
  
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
      message: "User not found",
    };
  }
  if (user.emailVerified) {
    return {
      success: false,
      message: "Email already verified",
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
      message: "Invalid verification code",
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

export async function resendVerificationCodeAction(
  email: string,
): Promise<ServerActionResult<null>> {
  
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
      message: "User not found",
    };
  }
  try {
    await sendVerificationCode(email);
  } catch {
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to send verification code",
    };
  }
  return {
    success: true,
    data: null,
  };
}
