import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Creates and returns a configured email transporter
 */
export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASSWORD!,
    },
  });
}

/**
 * Sends an email using the configured transporter
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_DEFAULT_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
}
