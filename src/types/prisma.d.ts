declare module "@/prisma/client" {
  export * from "@/prisma/client/index";
  import Stripe from "stripe";

  export type UserType = "Personal" | "TeamMember";

  export type UserExtra = Partial<{
    stripeCustomerId: string;
  }>;

  export type UserLastLogin = Partial<{
    timestamp: number;
    clientIp: string;
    userAgent: string;
    geo: Partial<{
      country: string;
      countryCode: string;
      city: string;
    }>;
  }>;

  export type AnalystReportExtra = Partial<{
    coverObjectUrl: string;
    pdfObjectUrl: string;
  }>;

  export type UserChatExtra = Partial<{
    clientIp: string;
    userAgent: string;
    locale: string;
    feedback: {
      rating: string;
      submittedAt: string;
    };
    geo: Partial<{
      country: string;
      countryCode: string;
      city: string;
    }>;
    newStudyUserChatToken: string;
    briefUserChatId: number;
    error: string;
  }>; // & Record<string, string | number>

  // for extra field on ChatStatistics and UserTokensLog
  export type AgentStatisticsExtra = {
    reportedBy: string;
  } & Record<string, unknown>;

  export type UserSubscriptionExtra = Partial<{
    // ... pingxx invoice data tbd
    paymentRecordId: number;
    invoice: Stripe.Invoice;
  }>;

  export type UserTokensExtra = Partial<{
    activeUserSubscriptionId: number;
  }>;

  export type TeamTokensExtra = Partial<{
    activeUserSubscriptionId: number;
  }>;

  export type ChatMessageAttachment = {
    objectUrl: string; // s3 object url without signature
    name: string;
    mimeType: string;
    size: number; // bytes
  };

  export type ImageGenerationExtra = Partial<{
    ratio: string;
    reportToken: string;
    midjourney: { urls: string[] };
    s3SignedUrl: string;
    s3SignedUrlExpiresAt: number; // timestamp millis
  }>;

  export type AttachmentFileExtra = Partial<{
    s3SignedUrl: string;
    s3SignedUrlExpiresAt: number; // timestamp millis
  }>;

  export type PersonaImportExtra = Partial<{
    error: string;
    processing: boolean;
  }>;

  // 只覆盖这个不够，findUnique 返回的类型还是原来的
  // import { User as UserPrisma } from "@/prisma/client/index";
  // export type User = Omit<UserPrisma, "lastLogin"> & {
  //   lastLogin: UserLastLogin;
  // };
  // import { AnalystReport as AnalystReportPrisma } from "@/prisma/client/index";
  // export type AnalystReport = Omit<AnalystReportPrisma, "extra"> & {
  //   extra: {
  //     coverObjectUrl?: string;
  //     pdfObjectUrl?: string;
  //   } | null;
  // };
}
