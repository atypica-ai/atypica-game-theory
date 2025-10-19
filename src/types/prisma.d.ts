import { V4MessagePart, V5MessagePart } from "@/ai/v4";

declare module "@/prisma/client" {
  export * from "@/prisma/client/index";

  export type UserType = "Personal" | "TeamMember";

  export type UserOnboardingData = Partial<{
    usageType: "work" | "personal";
    role: string;
    industry: string;
    companyName: string;
    howDidYouHear: string;
    completedAt: Date;
  }>;

  // deprecated
  export type DeprecatedUserExtra = Partial<{
    // stripeCustomerId: string; // dropped, see payment/(stripe)/create.ts
    onboarding: UserOnboardingData;
    lastTrack: number; // timestamp of last trackUser
  }>;

  export type UserProfileExtra = Partial<{
    lastTrack: number; // timestamp of last trackUser
    acquisition: {
      utm?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_term?: string;
        utm_content?: string;
        capturedAt: string;
      };
      referer?: {
        referer: string;
        hostname: string;
        capturedAt: string;
      };
    };
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

  export type ChatMessagePart = V4MessagePart | V5MessagePart;

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
    questionTypePreference: "open-ended" | "multiple-choice" | "mixed"; // 问题类型偏好
    permanentShareToken: string; // 永久链接令牌，用于验证永久链接
  }>;

  export type InterviewSessionExtra = Partial<{
    error: string; // 错误信息
    ongoing: boolean; // 是否正在进行中
    startsAt: number; // 开始时间戳（首次消息时设置）
    pdfObjectUrl: string; // PDF文件的S3对象URL
    preferredLanguage: string; // 用户偏好的访谈语言
    personalInfo: Array<{ label: string; text: string }>; // 个人信息字段（灵活结构）
  }>;

  export type InterviewReportExtra = Partial<{
    sessions: Array<{
      id: number;
      title: string;
    }>;
    pdfObjectUrl: string;
  }>;

  export type AnalystPodcastExtra = Partial<{
    // S3 签名URL缓存（音频文件）
    s3SignedUrl: string;
    s3SignedUrlExpiresAt: number; // timestamp millis

    // 处理状态 - 参考 PersonaImportExtra 的详细模式
    processing:
      | {
          startsAt: number; // timestamp, typeof Date.now()
          scriptGeneration: boolean; // 脚本生成是否完成
          audioGeneration: boolean; // 音频生成是否完成
        }
      | false; // false 表示未开始或已完成

    // 错误信息 - 保持与其他 extra 一致
    error: string;
  }>;

  export type AnalystExtra = Partial<{
    podcastEvaluation: { processing?: boolean } & Record<string, unknown>;
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
