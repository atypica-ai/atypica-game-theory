export * from "./generated/browser"; // 导出前端可以用的类型，包含 enum 和 models
// export * from "./generated/enums";
// export * from "./generated/models";  // 只包含类似 UserModel 这样的对象，没有 User

import { V4MessagePart, V5MessagePart } from "@/ai/v4";

/**
 * Enums
 */

// nothing

/**
 * Types
 */

export type UserType = "Personal" | "TeamMember";

export type UserOnboardingData = Partial<{
  usageType: "work" | "personal";
  role: string;
  industry: string;
  companyName: string;
  howDidYouHear: string;
  completedAt: string; // ISOString
}>;

// deprecated
export type DeprecatedUserExtra = Partial<{
  // stripeCustomerId: string; // dropped, see payment/(stripe)/create.ts
  onboarding: UserOnboardingData;
  lastTrack: number; // timestamp of last trackUser
}>;

export type UserProfileExtra = Partial<{
  lastTrack: number; // timestamp of last trackUser
  stripeCustomerIds: Partial<{
    USD: string;
    CNY: string;
  }>;
  acquisition: {
    utm?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
      capturedAt?: string;
    };
    referer?: {
      referer: string;
      hostname: string;
      capturedAt?: string;
    };
  };
  tolt?: {
    via: string; // referral code from ?via=xxx
    capturedAt?: string;
    customerId?: string; // Tolt customer ID (set after signup tracking)
    partnerId?: string; // Tolt partner ID
    clickId?: string; // Tolt click ID
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
  provider: "email-password" | "impersonation" | "team-switch" | "google" | "aws-marketplace";
}>;

export type AnalystReportExtra = Partial<{
  title: string;
  description: string;
  userChatToken: string;
  analystKind: string; //AnalystKind;
  coverObjectUrl: string;
  // s3SignedCoverObjectUrl: string | null;
  // s3SignedCoverObjectUrlExpiresAt: number | null; // timestamp millis
  pdfObjectUrl: string;
  // s3SignedPdfObjectUrl: string;
  // s3SignedPdfObjectUrlExpiresAt: number; // timestamp millis
}>;

export type UserChatExtra = Partial<{
  // 客户端信息
  clientIp: string;
  userAgent: string;
  locale: string;
  geo: Partial<{
    country: string;
    countryCode: string;
    city: string;
  }>;
  // user chat 通用信息
  feedback: {
    rating: string;
    submittedAt: string;
  };
  // Runtime execution ownership marker. If present, this chat is currently running in background.
  runId: string;
  error: string;
  // 下一步操作建议（从 Analyst.extra 迁移过来）
  recommendedStudies: {
    questions?: Array<{
      title: string;
      brief: string;
    }>;
    generatedAt?: string;
    processing?: string; // 存储开始时间戳 Date.now().toString()
  };
  /**
   * @deprecated 以下字段已迁移到 UserChat.context
   * 迁移脚本: scripts/archive/legacy/2026-01/migrate-to-context-driven.sql (迁移 8)
   * 请改用 UserChatContext 中的对应字段
   */
  // referenceUserChats: string[]; // 已迁移到 context.referenceUserChats
  // researchTemplateId: number; // 已迁移到 context.researchTemplateId
  // newStudyUserChatToken: string; // 已迁移到 context.newStudyUserChatToken
  // briefUserChatId: number; // 已迁移到 context.briefUserChatId
  // deepResearchExpert: "grok" | "trendExplorer"; // 已迁移到 context.deepResearchExpert
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
  // s3SignedUrl: string;
  // s3SignedUrlExpiresAt: number; // timestamp millis
  error: string;
}>;

export type AttachmentFileExtra = Partial<{
  // s3SignedUrl: string;
  // s3SignedUrlExpiresAt: number; // timestamp millis
  processing:
    | {
        startsAt: number;
      }
    | false;
  compressedText: string;
  error: string;
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

export type InterviewProjectQuestion = {
  text: string;
  image?: ChatMessageAttachment; // 使用标准的 attachment 结构
  questionType?: "open" | "single-choice" | "multiple-choice";
  hint?: string; // AI 处理问题的自然语言提示
  options?: Array<string | { text: string }>; // 选择题的选项（支持旧格式兼容）
};

export type InterviewProjectExtra = Partial<{
  error: string;
  processing: boolean;
  permanentShareToken: string; // 永久链接令牌，用于验证永久链接
}>;

export type InterviewSessionExtra = Partial<{
  error: string; // 错误信息
  ongoing: boolean; // 是否正在进行中
  startsAt: number; // 开始时间戳（首次消息时设置）
  pdfObjectUrl: string; // PDF文件的S3对象URL
  preferredLanguage: string; // 用户偏好的访谈语言
  personalInfo: Array<{ label: string; text: string }>; // 个人信息字段（灵活结构）
  questions: Array<{
    text: string;
    image?: ChatMessageAttachment; // 问题图片
    questionType?: "open" | "single-choice" | "multiple-choice";
    hint?: string; // AI 处理问题的自然语言提示
    options?: Array<string | { text: string }>; // 选择题的选项（支持旧格式兼容）
  }>; // 问题列表快照（创建 Session 时从 Project 复制）
}>;

export type InterviewReportExtra = Partial<{
  sessions: Array<{
    id: number;
    title: string;
  }>;
  pdfObjectUrl: string;
  error: string; // 错误信息
}>;

export type AnalystPodcastExtra = Partial<{
  userChatToken: string;

  metadata: {
    title?: string;
    mimeType?: string; // 默认是 audio/mpeg，但是还是保存下来
    duration?: number; // 音频时长，单位：秒
    size?: number; // 文件大小，单位：字节
    showNotes?: string; // 播客节目说明
    coverObjectUrl?: string; // 封面图片
  };

  // Podcast kind determination by LLM with reasoning
  kindDetermination: {
    kind: "deepDive" | "opinionOriented" | "fastInsight" | "debate";
    reason: string;
    systemPrompt?: string; // 覆盖 systemPrompt
  };

  // S3 签名URL缓存（音频文件）
  // s3SignedUrl: string;
  // s3SignedUrlExpiresAt: number; // timestamp millis

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

// AnalystExtra 和 UserChatExtra 的关系是：
// 研究开始前的额外信息，都存 UserChatExtra，是发起研究或者需求相关对的
// 研究结束后的额外信息，都存 AnalystExtra，是产物或者下一步动作相关
// export type AnalystExtra = Partial<{
//   /**
//    * @deprecated 已迁移到 UserChat.extra
//    * 使用 UserChatExtra.recommendedStudies 代替
//    * 迁移脚本: scripts/archive/legacy/2026-01/migrate-to-context-driven.sql (迁移 7)
//    */
//   // recommendedStudies: {
//   //   questions: Array<{
//   //     title: string;
//   //     brief: string;
//   //   }>;
//   //   generatedAt?: string;
//   //   processing?: string; // 存储开始时间戳 Date.now().toString()
//   // };
// }>;

export type SubscriptionExtra = Partial<{
  seats: number;
}>;

export type TokensAccountExtra = Partial<{
  unlimitedTokens: boolean;
}>;

export type TokensLogExtra = Partial<
  AgentStatisticsExtra & {
    noCharge: boolean;
  }
>;

export type TeamExtra = Partial<{
  unlimitedSeats: boolean;
}>;

export type ApiKeyExtra = Partial<{
  createdByEmail: string; // Email of the creator
}>;

export type FeaturedItemExtra = Partial<{
  title: string;
  description: string;
  coverObjectUrl: string;
  url: string;
  category: string; // report 的 analyst.kind, podcast 暂时没有不需要设置
  tags: string; // 逗号分隔的标签字符串
}>;

export enum FeaturedItemResourceType {
  StudyUserChat = "StudyUserChat",
  AnalystReport = "AnalystReport",
  AnalystPodcast = "AnalystPodcast",
}

export type BlogArticleExtra = Partial<{
  contentType: "html" | "markdown";
  coverSrc: string;
  originalUrl: string; // Substack 原文链接
}>;

export type ResearchTemplateExtra = Partial<{
  useCount: number; // 使用次数统计
  tags: string[]; // Research method tags
}>;

export type PersonaExtra = Partial<{
  role: "consumer" | "buyer" | "expert"; // Persona role: consumer (B2C), buyer (B2B), expert (domain specialist)
  quote: string; // First-person quote reflecting personality and preferences (~120 Chinese chars or ~80 English words)
  // Common fields - use 2-3 fields based on role
  ageRange: "0-17" | "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+"; // Age range (mainly for consumer)
  location: string; // Location format: English "City, Country" (e.g. "Shanghai, China") or Chinese "国家城市" (e.g. "中国上海")
  industry: string; // Industry/domain (for buyer & expert) - e.g. "FinTech", "AI"
  title: string; // Job title/role (all types) - e.g. "Stay-at-home Parents", "IT Procurement Manager", "Senior Researcher"
  organization: string; // Organization (for buyer & expert) - e.g. "500-1000 employees", "Tsinghua University"
  experience: string; // Experience/seniority (mainly for expert) - e.g. "10 years"
}>;

export type PersonaPanelExtra = Partial<{
  processing:
    | {
        startsAt: number; // timestamp, typeof Date.now()
      }
    | false; // false 表示未开始或已完成
  error: string; // 错误信息
}>;

export type DiscussionTimelineExtra = Partial<{
  error: string | null; // Error message if processing failed
  moderatorSystem: string; // Moderator system prompt
}>;

export type AgentSkillExtra = Partial<{
  // 来源信息
  source: "upload" | "sage"; // 技能来源
  sourceId: number; // 如果来自 Sage，记录 Sage ID

  // 本地缓存路径（运行时计算，不持久化到数据库）
  // 格式: /tmp/skills/{userId}/{skillName} 或 {cwd}/skills/{userId}/{skillName}
  // localPath: string; // 注释：可以通过 userId 和 name 构建，无需存储
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

// Pulse
export type PulsePostData = {
  postId: string;
  content: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  url?: string;
  author?: string;
};

export type PulseExtra = Partial<{
  posts: PulsePostData[];
  carriedOverDays: number;
  matchedYesterdayPulseId: number;
  error: {
    reason: string;
    details: string;
    stack?: string;
    timestamp: string;
  };
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
