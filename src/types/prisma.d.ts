declare module "@/prisma/client" {
  import Stripe from "stripe";
  export * from "@/prisma/client/index";

  export type AnalystReportExtra = {
    coverObjectUrl?: string;
    pdfObjectUrl?: string;
  } | null;

  export type UserChatExtra =
    | {
        clientIp: string | null;
        userAgent: string | null;
        locale: string;
        feedback?: {
          rating: string;
          submittedAt: string;
        };
        geo?: {
          country: string | null;
          countryCode: string | null;
          city: string | null;
        } | null;
        newStudyUserChatToken: string;
        briefUserChatId?: number;
        error?: string;
      } // & Record<string, string | number>)
    | null;

  export type UserSubscriptionExtra = {
    // ... pingxx invoice data tbd
    paymentRecordId: number;
    invoice?: Stripe.Invoice;
  } | null;

  export type ChatMessageAttachment = {
    objectUrl: string; // s3 object url without signature
    name: string;
    mimeType: string;
    size: number; // bytes
  };

  export type ImageGenerationExtra = {
    ratio: string;
    reportToken: string;
    midjourney?: { urls: string[] };
    s3SignedUrl?: string;
    s3SignedUrlExpiresAt?: number; // timestamp millis
  } | null;

  export type AttachmentFileExtra = {
    s3SignedUrl?: string;
    s3SignedUrlExpiresAt?: number; // timestamp millis
  } | null;

  export type PersonaImportExtra = {
    error?: string;
  } | null;

  // import { AnalystReport as AnalystReportPrisma } from "@/prisma/client/index";
  // // 只覆盖这个不够，findUnique 返回的类型还是原来的
  // export type AnalystReport = Omit<AnalystReportPrisma, "extra"> & {
  //   extra: {
  //     coverObjectUrl?: string;
  //     pdfObjectUrl?: string;
  //   } | null;
  // };
}
