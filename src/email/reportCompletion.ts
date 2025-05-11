import { getTranslations } from "next-intl/server";
import { EmailOptions, sendEmail } from "./lib";

interface ReportCompletionEmailParams {
  email: string;
  topic: string;
  studyUrl: string;
}

/**
 * Sends a report completion email to the user
 */
export async function sendReportCompletionEmail(
  params: ReportCompletionEmailParams,
): Promise<void> {
  const { email, topic, studyUrl } = params;
  const t = await getTranslations("Email.ReportCompletion");

  const emailOptions: EmailOptions = {
    to: email,
    subject: t("subjectLine"),
    text: `${t("greeting")}\n\n${t("reportReadyText", { topic: topic })}\n\n${t("viewStudyText")}: ${studyUrl}\n\n${t("thanksMessage")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${t("emailTitle")}</h2>
        <p>${t("greeting")}</p>
        <p>${t("reportReadyText", { topic: topic })}</p>

        <div style="margin: 20px 0;">
          <p>${t("viewStudyMessage")}</p>
          <div style="margin: 15px 0;">
            <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
              ${t("viewStudyButtonText")}
            </a>
          </div>
        </div>

        <p>${t("thanksMessage")}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">${t("automatedEmailDisclaimer")}</p>
      </div>
    `,
  };

  await sendEmail(emailOptions);
}
