import "server-only";

import { sendVerificationEmail } from "@/email/verification";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";

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

  try {
    await sendVerificationEmail({
      email: userEmail,
      verificationCode,
    });
  } catch (error) {
    rootLogger.error(
      `Error sending verification email to ${userEmail}: ${(error as Error).message}`,
    );
    throw error;
  }
};
