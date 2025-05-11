import { getTranslations } from "next-intl/server";
import { EmailOptions, sendEmail } from "./lib";

interface VerificationEmailParams {
  email: string;
  verificationCode: string;
}

/**
 * Sends an email verification code to the user
 */
export async function sendVerificationEmail(params: VerificationEmailParams): Promise<void> {
  const { email, verificationCode } = params;
  const t = await getTranslations("Email.Verification");

  const emailOptions: EmailOptions = {
    to: email,
    subject: t("subjectLine"),
    text: `${t("verificationCodeText", { code: verificationCode })}\n\n${t("expirationNote")}\n\n${t("ignoreMessage")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${t("emailTitle")}</h2>
        <p>${t("useCodeInstructions")}</p>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${verificationCode}
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
