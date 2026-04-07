import { rootLogger } from "@/lib/logging";
import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email using Resend
 */
export async function sendEmail(
  options: EmailOptions,
  { throwError = false }: { throwError?: boolean } = {},
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    rootLogger.info(
      `Email successfully delivered to ${options.to} with subject: "${options.subject}"`,
    );
  } catch (error) {
    rootLogger.error(`Failed to send email to ${options.to}: ${error}`);
    if (throwError) {
      throw error;
    }
  }
}
