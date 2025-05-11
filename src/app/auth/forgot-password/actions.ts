"use server";
import { encryptText } from "@/lib/cipher";
import { getRequestOrigin } from "@/lib/request/headers";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";
import nodemailer from "nodemailer";

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

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST!,
      port: parseInt(process.env.EMAIL_PORT!),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASSWORD!,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_DEFAULT_FROM,
      to: email,
      subject: t("emailContent.subjectLine"),
      text: `${t("emailContent.resetInstructions")}\n\n${resetUrl}\n\n${t("emailContent.expirationNote")}\n\n${t("emailContent.ignoreMessage")}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${t("emailContent.emailTitle")}</h2>
          <p>${t("emailContent.resetInstructions")}</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              ${t("emailContent.resetButtonText")}
            </a>
          </div>
          <p>${t("emailContent.expirationNote")}</p>
          <p>${t("emailContent.ignoreMessage")}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #777;">${t("emailContent.automatedEmailDisclaimer")}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

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
