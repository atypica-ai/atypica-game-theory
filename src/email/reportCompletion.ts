import { Locale } from "next-intl";
import { EmailOptions, sendEmail } from "./lib";

/**
 * Sends a report completion email to the user
 */
export async function sendReportCompletionEmail({
  email,
  topic,
  studyUrl,
  locale,
}: {
  email: string;
  topic: string;
  studyUrl: string;
  locale: Locale;
}): Promise<void> {
  const emailOptions: EmailOptions =
    locale === "zh-CN"
      ? {
          to: email,
          subject: "您的 atypica.AI 研究报告已准备就绪",
          text: `
您好，
您关于"${topic}"的研究报告已成功生成，现在可以查看了。
您可以通过访问研究页面查看您的报告: ${studyUrl}
感谢您使用 atypica.AI 进行研究。希望提供的见解对您有价值。
这是来自 atypica.AI 的自动邮件。请勿回复此邮件。
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">研究报告已生成</h2>
  <p>您好，</p>
  <p>您关于"${topic}"的研究报告已成功生成，现在可以查看了。</p>
  <div style="margin: 20px 0;">
    <p>请访问研究页面查看您的报告：</p>
    <div style="margin: 15px 0;">
      <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        查看研究页面
      </a>
    </div>
  </div>
  <p>感谢您使用 atypica.AI 进行研究。希望提供的见解对您有价值。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">这是来自 atypica.AI 的自动邮件。请勿回复此邮件。</p>
</div>
`,
        }
      : {
          to: email,
          subject: "Your atypica.AI Report is Ready",
          text: `
Hello,
Your study report for "${topic}" has been successfully generated and is now available for viewing.
You can access your report by visiting the study: ${studyUrl}
Thank you for using atypica.AI for your study needs. We hope the insights provided are valuable to you.
This is an automated email from atypica.AI. Please do not reply to this email.
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Study Report Ready</h2>
  <p>Hello,</p>
  <p>Your study report for "${topic}" has been successfully generated and is now available for viewing.</p>
  <div style="margin: 20px 0;">
    <p>Please visit the study to view your report:</p>
    <div style="margin: 15px 0;">
      <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        View Study
      </a>
    </div>
  </div>
  <p>Thank you for using atypica.AI for your study needs. We hope the insights provided are valuable to you.</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">This is an automated email from atypica.AI. Please do not reply to this email.</p>
</div>
`,
        };

  await sendEmail(emailOptions);
}
