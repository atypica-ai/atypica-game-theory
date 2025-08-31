"use server";
import { decryptText } from "@/lib/cipher";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { hash } from "bcryptjs";
import { getTranslations } from "next-intl/server";

export const resetPassword = async ({
  token,
  password,
}: {
  token: string;
  password: string;
}): Promise<ServerActionResult<boolean>> => {
  const t = await getTranslations("Auth.ResetPassword");

  if (!token || !password) {
    return {
      success: false,
      message: t("invalidOrExpiredToken"),
    };
  }

  try {
    // Decrypt the token to get the payload
    const decryptedToken = decryptText(token);
    const payload = JSON.parse(decryptedToken) as { email: string; expiresAt: string };

    // Check if token is expired
    if (new Date(payload.expiresAt) < new Date()) {
      return {
        success: false,
        message: t("invalidOrExpiredToken"),
      };
    }

    const email = payload.email.toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        code: "not_found",
        message: t("invalidOrExpiredToken"),
      };
    }

    // Update the user's password
    const hashedPassword = await hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      message: t("invalidOrExpiredToken"),
    };
  }
};
