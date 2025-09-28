import { Locale } from "next-intl";
import { EmailOptions, sendEmail } from "./lib";

/**
 * Sends an email verification code to the user
 */
export async function sendVerificationEmail({
  email,
  verificationCode,
  locale,
}: {
  email: string;
  verificationCode: string;
  locale: Locale;
}): Promise<void> {
  const emailOptions: EmailOptions =
    locale === "zh-CN"
      ? {
          to: email,
          subject: "您的 atypica.AI 验证码",
          text: `
您的验证码是：${verificationCode}
此验证码将在30分钟后过期。
如果您没有请求此验证码，请忽略此邮件。
这是来自 atypica.AI 的自动邮件。请勿回复此邮件。
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">您的验证码</h2>
  <p>请使用以下验证码验证您的电子邮箱地址：</p>
  <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
    ${verificationCode}
  </div>
  <p>此验证码将在30分钟后过期。</p>
  <p>如果您没有请求此验证码，请忽略此邮件。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">这是来自 atypica.AI 的自动邮件。请勿回复此邮件。</p>
</div>
`,
        }
      : {
          to: email,
          subject: "Your atypica.AI Verification Code",
          text: `
Your verification code is: ${verificationCode}
This code will expire in 30 minutes.
If you didn't request this code, please ignore this email.
This is an automated email from atypica.AI. Please do not reply to this email.
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Your Verification Code</h2>
  <p>Please use the following code to verify your email address:</p>
  <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
    ${verificationCode}
  </div>
  <p>This code will expire in 30 minutes.</p>
  <p>If you didn't request this code, please ignore this email.</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">This is an automated email from atypica.AI. Please do not reply to this email.</p>
</div>
`,
        };

  await sendEmail(emailOptions);
}
