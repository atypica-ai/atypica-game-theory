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
  error: string; // Error message if processing failed
  recommendedQuestions: string[]; // Recommended questions for users to ask the sage
  // 暂时没用
  processing:
    | {
        startsAt: number; // timestamp, typeof Date.now()
        sources: boolean;
        memoryDocument: boolean;
        knowledgeGaps: boolean;
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
  error: string;
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

export type SageKnowledgeGapExtra = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

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
 * SageInterview
 */

export enum SageInterviewStatus {
  DRAFT = "draft",
  ONGOING = "ongoing",
  COMPLETED = "completed",
}

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

export type SageChatExtra = {
  error: string; // 错误信息
  ongoing: boolean; // 是否正在进行中
  startsAt: number; // 开始时间戳（首次消息时设置）
};

/**
 * SageMemoryDocumentExtra
 */

export type SageMemoryDocumentExtra = Partial<{
  source:
    | {
        type: "initial" | "manual";
      }
    | {
        type: "interview";
        userChatToken: string; // SageInterview's chat token
      };
}>;

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

export type CreateSageInput = z.infer<typeof createSageInputSchema>;

export type ExtractedMemory = {
  content: string;
  category: string;
  tags: string[];
  importance: "high" | "medium" | "low";
  keyTakeaway: string;
};
