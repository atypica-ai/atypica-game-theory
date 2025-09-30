import { Locale } from "next-intl";
import { EmailOptions, sendEmail } from "./lib";

export async function sendPodcastReadyEmail({
  email,
  title,
  podcastUrl,
  studyUrl,
  locale,
}: {
  email: string;
  title: string;
  podcastUrl: string;
  studyUrl: string;
  locale: Locale;
}): Promise<void> {
  const emailOptions: EmailOptions =
    locale === "zh-CN"
      ? {
          to: email,
          subject: "您的 atypica.AI 播客已准备就绪",
          text: `您好，\n基于“${title}”研究生成的播客已经完成。\n您可以前往播客页面收听：${podcastUrl}\n若需查看完整研究，请访问：${studyUrl}\n感谢使用 atypica.AI。这是一封自动邮件，请勿回复。`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">播客生成完成</h2>
  <p>您好，</p>
  <p>基于“${title}”研究生成的播客已经完成，可以立即收听。</p>
  <div style="margin: 20px 0;">
    <p>前往播客页面：</p>
    <div style="margin: 12px 0;">
      <a href="${podcastUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        收听播客
      </a>
    </div>
    <p>查看完整研究：</p>
    <div style="margin: 12px 0;">
      <a href="${studyUrl}" style="background-color: #111; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        查看研究
      </a>
    </div>
  </div>
  <p>感谢使用 atypica.AI，希望这些洞察对您有所帮助。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">这是来自 atypica.AI 的自动邮件。请勿回复此邮件。</p>
</div>
`,
        }
      : {
          to: email,
          subject: "Your atypica.AI Podcast is Ready",
          text: `Hello,\nYour podcast based on “${title}” has finished generating.\nListen now: ${podcastUrl}\nView the full study here: ${studyUrl}\nThanks for using atypica.AI. This is an automated email—please do not reply.`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Podcast Ready</h2>
  <p>Hello,</p>
  <p>Your podcast generated from “${title}” is now ready to listen.</p>
  <div style="margin: 20px 0;">
    <p>Listen to the podcast:</p>
    <div style="margin: 12px 0;">
      <a href="${podcastUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Listen Now
      </a>
    </div>
    <p>View the full study:</p>
    <div style="margin: 12px 0;">
      <a href="${studyUrl}" style="background-color: #111; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
        View Study
      </a>
    </div>
  </div>
  <p>Thanks for using atypica.AI—we hope the insights are valuable.</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">This is an automated email from atypica.AI. Please do not reply to this email.</p>
</div>
`,
        };

  await sendEmail(emailOptions);
}
