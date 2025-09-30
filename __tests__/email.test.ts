import { sendEmail } from "@/email/lib";
import { sendPasswordResetEmail } from "@/email/passwordReset";
import { sendPodcastReadyEmail } from "@/email/podcastReady";
import { sendReportCompletionEmail } from "@/email/reportCompletion";
import { sendStudyInterruptionEmail } from "@/email/studyInterruption";
import { sendVerificationEmail } from "@/email/verification";
import { loadEnvConfig } from "@next/env";
import { beforeEach, describe, expect, it, vi } from "vitest";

const FAKE_URL = "https://atypica.ai/fake";
// const locale = "zh-CN";
const locale = "en-US";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (key: string) => {
    const messages = (await import(`../messages/${locale}.json`)).default;
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subMessages = keys.reduce((acc: any, key: string) => acc[key], messages);
    const t = (key: string) => {
      const keys = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = keys.reduce((acc: any, key: string) => acc[key], subMessages);
      return message;
    };
    return t;
  }),
}));

beforeEach(() => {
  // 加载 .env 文件
  loadEnvConfig(process.cwd());
});

describe.skip("Email Module Tests", () => {
  it("should config email test receiver", () => {
    expect(process.env.EMAIL_TEST_RECEIVER).toBeDefined();
  });
  describe("Send Email Function", () => {
    it("sends an email with correct options", async () => {
      const options = {
        to: process.env.EMAIL_TEST_RECEIVER!,
        subject: "Test Subject",
        text: "Test Text Content",
        html: "<p>Test HTML Content</p>",
      };
      console.log(options);
      await sendEmail(options);
    });
    it("sendPasswordResetEmail", async () => {
      await sendPasswordResetEmail({
        email: process.env.EMAIL_TEST_RECEIVER!,
        resetUrl: FAKE_URL,
        locale,
      });
    });
    it("sendVerificationEmail", async () => {
      await sendVerificationEmail({
        email: process.env.EMAIL_TEST_RECEIVER!,
        verificationCode: "123456",
        locale,
      });
    });
    it("sendReportCompletionEmail", async () => {
      await sendReportCompletionEmail({
        email: process.env.EMAIL_TEST_RECEIVER!,
        title: "测试研究",
        studyUrl: FAKE_URL,
        locale,
      });
    });
    it("sendStudyInterruptionEmail", async () => {
      await sendStudyInterruptionEmail({
        email: process.env.EMAIL_TEST_RECEIVER!,
        title: "测试研究",
        studyUrl: FAKE_URL,
        locale,
      });
    });
    it("sendPodcastReadyEmail", async () => {
      await sendPodcastReadyEmail({
        email: process.env.EMAIL_TEST_RECEIVER!,
        title: "测试播客",
        podcastUrl: `${FAKE_URL}/podcast`,
        studyUrl: FAKE_URL,
        locale,
      });
    });
  });
});
