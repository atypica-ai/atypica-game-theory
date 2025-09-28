import { Locale } from "next-intl";
import { EmailOptions, sendEmail } from "./lib";

/**
 * Sends a research interruption email to the user
 */
export async function sendStudyInterruptionEmail({
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
          subject: "您的 atypica.AI 研究意外中断",
          text: `
您好，
您关于"${topic}"的研究意外中断。请勿担心，您的进度已被保存。
您可以通过点击下方链接前往您的研究，然后在聊天框中输入「继续」或点击继续按钮：
${studyUrl}
如果您遇到任何问题，请点击研究页面右下角的聊天图标寻求帮助。
感谢您的耐心等待，也感谢您使用 atypica.AI 满足您的研究需求。
这是来自 atypica.AI 的自动邮件。请勿回复此邮件。
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">研究中断通知</h2>
  <p>您好，</p>
  <p>您关于"${topic}"的研究意外中断。请勿担心，您的进度已被保存。</p>
  <p>您可以通过点击下方按钮前往您的研究，然后在聊天框中输入「继续」或点击继续按钮。</p>
  <div style="margin: 20px 0;">
    <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
      查看研究
    </a>
  </div>
  <p>如果您遇到任何问题，请点击研究页面右下角的聊天图标寻求帮助。</p>
  <p>感谢您的耐心等待，也感谢您使用 atypica.AI 满足您的研究需求。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">这是来自 atypica.AI 的自动邮件。请勿回复此邮件。</p>
</div>
`,
        }
      : {
          to: email,
          subject: "Your atypica.AI Study Was Interrupted",
          text: `
Hello,
Your study on "${topic}" was unexpectedly interrupted. Don't worry, your progress has been saved.
You can continue your study by clicking the link below and then typing 'continue' in the chat box or clicking the Continue button:
${studyUrl}
If you encounter any issues, please click the chat icon in the bottom right corner of the study page for assistance.
Thank you for your patience and for using atypica.AI for your study needs.
This is an automated email from atypica.AI. Please do not reply to this email.
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Study Interruption Notification</h2>
  <p>Hello,</p>
  <p>Your study on "${topic}" was unexpectedly interrupted. Don't worry, your progress has been saved.</p>
  <p>You can continue your study by clicking the button below and then typing 'continue' in the chat box or clicking the Continue button.</p>
  <div style="margin: 20px 0;">
    <a href="${studyUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
      View Study
    </a>
  </div>
  <p>If you encounter any issues, please click the chat icon in the bottom right corner of the study page for assistance.</p>
  <p>Thank you for your patience and for using atypica.AI for your study needs.</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">This is an automated email from atypica.AI. Please do not reply to this email.</p>
</div>
`,
        };

  await sendEmail(emailOptions);
}
