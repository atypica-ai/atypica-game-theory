import { getTranslations } from "next-intl/server";
import { EmailOptions, sendEmail } from "./lib";

interface StudyInterruptionEmailParams {
  email: string;
  topic: string;
  studyUrl: string;
}

/**
 * Sends a research interruption email to the user
 */
export async function sendStudyInterruptionEmail(
  params: StudyInterruptionEmailParams,
): Promise<void> {
  const { email, topic, studyUrl } = params;
  const t = await getTranslations("Email.StudyInterruption");

  const emailOptions: EmailOptions = {
    to: email,
    subject: t("subjectLine"),
    text: `${t("greeting")}\n\n${t("interruptionText", { topic: topic })}\n\n${t("continueInstructionsText")}\n\n${t("studyLinkText")}: ${studyUrl}\n\n${t("supportText")}\n\n${t("thanksMessage")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${t("emailTitle")}</h2>
        <p>${t("greeting")}</p>
        <p>${t("interruptionText", { topic: topic })}</p>
        <p>${t("continueInstructionsText")}</p>

        <div style="margin: 20px 0;">
          <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t("continueButtonText")}
          </a>
        </div>

        <p>${t("supportText")}</p>
        <p>${t("thanksMessage")}</p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">${t("automatedEmailDisclaimer")}</p>
      </div>
    `,
  };

  await sendEmail(emailOptions);
}
