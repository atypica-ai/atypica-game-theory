import { getTranslations } from "next-intl/server";
import { EmailOptions, sendEmail } from "./lib";

interface PasswordResetEmailParams {
  email: string;
  resetUrl: string;
}

/**
 * Sends a password reset email to the user
 */
export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  const { email, resetUrl } = params;
  const t = await getTranslations("Email.PasswordReset");

  const emailOptions: EmailOptions = {
    to: email,
    subject: t("subjectLine"),
    text: `${t("resetInstructions")}\n\n${resetUrl}\n\n${t("expirationNote")}\n\n${t("ignoreMessage")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${t("emailTitle")}</h2>
        <p>${t("resetInstructions")}</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t("resetButtonText")}
          </a>
        </div>
        <p>${t("expirationNote")}</p>
        <p>${t("ignoreMessage")}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">${t("automatedEmailDisclaimer")}</p>
      </div>
    `,
  };

  await sendEmail(emailOptions);
}
