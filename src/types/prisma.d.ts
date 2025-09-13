declare module "@/prisma/client" {
  export * from "@/prisma/client/index";

  export type UserType = "Personal" | "TeamMember";

  export type UserOnboardingData = Partial<{
    usageType: "work" | "personal";
    role: string;
    industry: string;
    companyName: string;
    howDidYouHear: string;
  }>;

  export type UserExtra = Partial<{
    // stripeCustomerId: string; // dropped, see payment/(stripe)/create.ts
    onboarding: UserOnboardingData & { completedAt?: Date };
    lastTrack: number; // timestamp of last trackUser
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
    provider: "email-password" | "impersonation" | "team-switch" | "google";
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
    // processing: boolean;
    processing:
      | {
          startsAt: number; // timestamp, typeof Date.now()
          parseAttachment: boolean;
          buildPersonaPrompt: boolean;
          analyzeCompleteness: boolean;
        }
      | false;
  }>;

  export type InterviewProjectExtra = Partial<{
    error: string;
    processing: boolean;
    optimizedQuestions: string[];
    optimizationReason: string;
    lastOptimizedAt: number;
  }>;

  export type InterviewSessionExtra = Partial<{
    error: string; // 错误信息
    ongoing: boolean; // 是否正在进行中
    startsAt: number; // 开始时间戳（首次消息时设置）
    pdfObjectUrl: string; // PDF文件的S3对象URL
  }>;

  export type InterviewReportExtra = Partial<{
    sessions: Array<{
      id: number;
      title: string;
    }>;
  }>;

  // Removed
  // export type ProductExtra = Partial<{
  //   stripePriceId: string;
  // }>;
  // export type UserSubscriptionExtra = Partial<{
  //   // ... pingxx invoice data tbd
  //   paymentRecordId: number;
  //   invoice: Stripe.Invoice;
  // }>;
  // export type TokensAccountExtra = Partial<{
  //   activeUserSubscriptionId: number;
  // }>;

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
