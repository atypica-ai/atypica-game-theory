"use server";
import { sendPasswordResetEmail as sendResetEmail } from "@/email/passwordReset";
import { encryptText } from "@/lib/cipher";
import { getRequestOrigin } from "@/lib/request/headers";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";

export const sendPasswordResetEmail = async (
  email: string,
): Promise<ServerActionResult<boolean>> => {
  try {
    const t = await getTranslations("Auth.ForgotPassword");
    email = email.toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        code: "not_found",
        message: t("userNotFound"),
      };
    }

    // Create reset token payload with email and expiry
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes from now
    const payload = JSON.stringify({
      email,
      expiresAt: expiresAt.toISOString(),
    });

    // Encrypt the payload as the reset token
    const resetToken = encryptText(payload);

    // Create reset URL
    const siteOrigin = await getRequestOrigin();
    const resetUrl = `${siteOrigin}/auth/reset-password?token=${resetToken}`;

    // Send email using the extracted email module
    await sendResetEmail({
      email,
      resetUrl,
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Password reset email error:", error);
    return {
      success: false,
      message: "Failed to send reset email",
    };
  }
};
