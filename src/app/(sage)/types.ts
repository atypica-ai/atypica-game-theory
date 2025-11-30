import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { z } from "zod";

export type TSageMessageWithTool = TMessageWithPlainTextTool;

/**
 * Sage
 */

export type SageAvatar = Partial<{
  url: string;
}>;

export type SageExtra = Partial<{
  error: string | null; // Error message if processing failed
  recommendedQuestions: string[]; // Recommended questions for users to ask the sage
  // processing 表示正在提取 knowledge，其他处理中的状态不需要记录，这个状态很关键，提取中的时候不能做别的事情
  processing:
    | {
        startsAt: number; // timestamp, typeof Date.now()
      }
    | false;
}>;

/**
 * Sage Source
 */

export enum SageSourceType {
  TEXT = "text",
  FILE = "file",
  URL = "url",
}

export type SageSourceExtra = Partial<{
  error: string | null;
  processing: boolean;
}>;

/**
 * KnowledgeGap
 */

export enum SageKnowledgeGapSeverity {
  CRITICAL = "critical",
  IMPORTANT = "important",
  NICE_TO_HAVE = "nice-to-have",
}

export type SageKnowledgeGapExtra = Partial<{
  // AI-based gap resolution analysis
  resolutionConfidence: number; // 0-1, confidence that gap is resolved
  resolutionEvidence: string[]; // Evidence quotes from interview
  missingAspects: string[]; // If partially resolved, what aspects are still missing
}>;

export type SageKnowledgeGapSource = Partial<
  | {
      type: "analysis" | "system_suggestion";
    }
  | {
      type: "conversation";
      userChatToken: string; // SageChat's chat token
      quote: string;
    }
>;

export type SageKnowledgeGapResolvedBy = Partial<
  | {
      type: "interview";
      userChatToken: string; // SageInterview's chat token
    }
  | {
      type: "manual";
    }
>;

/**
 * Layered Memory
 */

export type WorkingMemoryItem = {
  id: string; // 唯一标识
  content: string; // 知识内容（Markdown）
  source: "interview" | "conversation";
  sourceId: string; // 来源 ID（interviewId 或 userChatToken）
  relatedGapIds?: number[]; // 解决的 Gap IDs
  status: "pending" | "integrated" | "discarded"; // 状态
};

// Episodic Memory - 只存 chatId，其他信息可以从 UserChat 表查询
export type EpisodicMemoryReference = string;

// 没有用到
export type SageMemoryDocumentExtra = {};

/**
 * SageInterview
 */

export type SageInterviewExtra = Partial<{
  error: string; // 错误信息
  ongoing: boolean; // 是否正在进行中
  startsAt: number; // 开始时间戳（首次消息时设置）timestamp, typeof Date.now()
  interviewPlan: {
    purpose: string;
    focusAreas: string[];
    questions: Array<{
      question: string;
      purpose: string;
      followUps: string[];
    }>;
  };
  completedAt: number; // timestamp, typeof Date.now()
  summary: string;
}>;

/**
 * SageChat
 */

// export type SageChatExtra = {
//   error: string; // 错误信息
//   ongoing: boolean; // 是否正在进行中
//   startsAt: number; // 开始时间戳（首次消息时设置）
// };

// ===== Zod Schemas for Input Validation =====

const sageSourceContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(SageSourceType.TEXT),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal(SageSourceType.FILE),
    objectUrl: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().positive(),
  }),
  z.object({
    type: z.literal(SageSourceType.URL),
    url: z.url(),
  }),
]);

export type SageSourceContent = z.infer<typeof sageSourceContentSchema>;

export const createSageInputSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  locale: z.enum(VALID_LOCALES),
  sources: z.array(sageSourceContentSchema).min(1).max(10),
});
