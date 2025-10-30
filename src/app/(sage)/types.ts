import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { z } from "zod";

// ===== Sage Types =====

// Message type for sage chat (currently no special tools)
export type TSageMessageWithTool = TMessageWithPlainTextTool;

// ===== Enums for Database Fields =====

// SageSource enums
export enum SageSourceType {
  TEXT = "text",
  FILE = "file",
  URL = "url",
}

export enum SageSourceStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// SageKnowledgeGap enums
export enum KnowledgeGapSourceType {
  ANALYSIS = "analysis",
  CONVERSATION = "conversation",
  SYSTEM_SUGGESTION = "system_suggestion",
}

export enum KnowledgeGapStatus {
  PENDING = "pending",
  RESOLVED = "resolved",
  DELETED = "deleted",
}

export enum KnowledgeGapSeverity {
  CRITICAL = "critical",
  IMPORTANT = "important",
  NICE_TO_HAVE = "nice-to-have",
}

export enum KnowledgeGapResolvedBy {
  INTERVIEW = "interview",
  MANUAL = "manual",
}

// SageMemoryDocument enums
export enum MemoryDocumentVersionSource {
  INITIAL = "initial",
  INTERVIEW = "interview",
  MANUAL = "manual",
}

// SageInterview enums
export enum SageInterviewStatus {
  DRAFT = "draft",
  ONGOING = "ongoing",
  COMPLETED = "completed",
}

// ===== Sage Entity Types =====

export interface SageExtra {
  processing?: {
    step?: string; // Current processing step
    progress?: number; // 0-1
    error?: string; // Error message if processing failed
    startedAt?: string; // ISO timestamp
    completedAt?: string; // ISO timestamp
  };
}

// KnowledgeGap from AI analysis (temporary, for creating DB records)
export interface KnowledgeGapFromAnalysis {
  area: string;
  severity: KnowledgeGapSeverity;
  description: string;
  impact: string;
  suggestedQuestions: string[];
}

// ===== SageInterview Types =====

export interface SageInterviewExtra {
  interviewPlan?: {
    purpose: string;
    focusAreas: string[];
    questions: Array<{
      question: string;
      purpose: string;
      followUps: string[];
    }>;
  };
  findings?: {
    keyDiscoveries?: string[];
    insights?: string[];
    quotableExcerpts?: string[];
    satisfactionLevel?: "excellent" | "good" | "fair";
  };
  currentFocus?: string;
  lastProgressUpdate?: string;
  completedAt?: string;
  newMemoriesCount?: number;
  memoryDocumentUpdated?: boolean;
}

// ===== SageSource Content Types (Union based on type field) =====

// Content stored in JSON field (without type, type is a separate DB field)
export type SageSourceContent =
  | {
      // For type: TEXT
      text: string;
    }
  | {
      // For type: FILE
      objectUrl: string;
      name: string;
      mimeType: string;
      size: number;
    }
  | {
      // For type: URL
      url: string;
    };

// ===== Zod Schemas for Input Validation =====

export const createSageSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(SageSourceType.TEXT),
    content: z.object({
      text: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal(SageSourceType.FILE),
    content: z.object({
      objectUrl: z.string().min(1),
      name: z.string().min(1),
      mimeType: z.string().min(1),
      size: z.number().positive(),
    }),
  }),
  z.object({
    type: z.literal(SageSourceType.URL),
    content: z.object({
      url: z.url(),
    }),
  }),
]);

export type CreateSageSourceInput = z.infer<typeof createSageSourceSchema>;

export const createSageInputSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  locale: z.string().min(2).max(16),
  sources: z.array(createSageSourceSchema).min(1).max(10),
});

export type CreateSageInput = z.infer<typeof createSageInputSchema>;

export const updateSageInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(255).optional(),
  memoryDocument: z.string().optional(),
  isPublic: z.boolean().optional(),
  allowTools: z.boolean().optional(),
});

export type UpdateSageInput = z.infer<typeof updateSageInputSchema>;

// ===== Extracted Memory Entry =====

export interface ExtractedMemory {
  content: string;
  category: string;
  tags: string[];
  importance: "high" | "medium" | "low";
  keyTakeaway: string;
}

// ===== Interview Plan =====

export interface InterviewQuestion {
  question: string;
  type: "background" | "knowledge" | "case" | "reflective" | "future";
  purpose: string;
  followUps: string[];
  expectedInsights: string[];
  priority: "high" | "medium" | "low";
}

export interface InterviewPlan {
  interviewPurpose: string;
  focusAreas: string[];
  questions: InterviewQuestion[];
  interviewGuidance: {
    openingMessage: string;
    probingTechniques: string[];
    closingMessage: string;
  };
  estimatedDuration: string;
}
