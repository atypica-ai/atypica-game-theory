import { Locale } from "next-intl";
import { EmailOptions, sendEmail } from "./lib";

/**
 * Sends a password reset email to the user
 */
export async function sendPasswordResetEmail({
  email,
  resetUrl,
  locale,
}: {
  email: string;
  resetUrl: string;
  locale: Locale;
}): Promise<void> {
  const emailOptions: EmailOptions =
    locale === "zh-CN"
      ? {
          to: email,
          subject: "您的 atypica.AI 密码重置链接",
          text: `
我们收到了重置您密码的请求。请点击下方链接创建新密码：
${resetUrl}
此链接将在30分钟后过期。
如果您没有请求重置密码，请忽略此邮件。
这是来自 atypica.AI 的自动邮件。请勿回复此邮件。
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">密码重置请求</h2>
  <p>我们收到了重置您密码的请求。请点击下方按钮创建新密码：</p>
  <div style="margin: 20px 0;">
    <a href="${resetUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
      重置密码
    </a>
  </div>
  <p>此链接将在30分钟后过期。</p>
  <p>如果您没有请求重置密码，请忽略此邮件。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">这是来自 atypica.AI 的自动邮件。请勿回复此邮件。</p>
</div>
`,
        }
      : {
          to: email,
          subject: "Your atypica.AI Password Reset Link",
          text: `
We received a request to reset your password. Click the link below to create a new password:
${resetUrl}
This link will expire in 30 minutes.
If you didn't request this password reset, please ignore this email.
This is an automated email from atypica.AI. Please do not reply to this email.
`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Password Reset Request</h2>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <div style="margin: 20px 0;">
    <a href="${resetUrl}" style="background-color: #1BFF1B; color: black; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Reset Password
    </a>
  </div>
  <p>This link will expire in 30 minutes.</p>
  <p>If you didn't request this password reset, please ignore this email.</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #777;">This is an automated email from atypica.AI. Please do not reply to this email.</p>
</div>
`,
        };

  await sendEmail(emailOptions);
}
