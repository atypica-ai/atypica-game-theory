import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { z } from "zod";

// ===== Sage Types =====

// Message type for sage chat (currently no special tools)
export type TSageMessageWithTool = TMessageWithPlainTextTool;

// ===== Sage Entity Types =====

export interface SageExtra {
  processing?: {
    step?: string; // Current processing step
    progress?: number; // 0-1
    error?: string; // Error message if processing failed
    startedAt?: string; // ISO timestamp
    completedAt?: string; // ISO timestamp
  };
  knowledgeAnalysis?: {
    overallScore?: number; // 0-100
    dimensions?: KnowledgeDimension[];
    knowledgeGaps?: KnowledgeGap[];
    analyzedAt?: string; // ISO timestamp
  };
}

export interface KnowledgeDimension {
  name: string;
  nameKey?: string; // i18n key
  score: number; // 0-100
  level: "high" | "medium" | "low";
  assessment: string;
  improvementSuggestions: string[];
}

// KnowledgeGap from AI analysis (temporary, for creating DB records)
export interface KnowledgeGapFromAnalysis {
  area: string;
  severity: "critical" | "important" | "nice-to-have";
  description: string;
  impact: string;
  suggestedQuestions: string[];
}

// Database KnowledgeGap types
export type KnowledgeGapSourceType = "analysis" | "conversation" | "system_suggestion";
export type KnowledgeGapStatus = "pending" | "resolved" | "deleted";
export type KnowledgeGapSeverity = "critical" | "important" | "nice-to-have";

export interface CreateKnowledgeGapInput {
  sageId: number;
  area: string;
  description: string;
  severity: KnowledgeGapSeverity;
  impact: string;
  sourceType: KnowledgeGapSourceType;
  sourceDescription: string;
  sourceReference?: string;
}

export interface UpdateKnowledgeGapStatusInput {
  gapId: number;
  status: KnowledgeGapStatus;
  resolvedBy?: "interview" | "manual";
  resolvedByInterviewId?: number;
}

// ===== SageChat Types =====

export interface SageChatExtra {
  // Additional metadata for sage chats
  [key: string]: unknown;
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

// ===== SageSource Types =====

export type SageSourceType = "text" | "file" | "url";

export interface SageSourceContent {
  // For text type
  text?: string;
  // For file type
  objectUrl?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  // For url type
  url?: string;
}

// ===== Zod Schemas for Input Validation =====

export const createSageSourceSchema = z.object({
  type: z.enum(["text", "file", "url"]),
  content: z.object({
    text: z.string().optional(),
    objectUrl: z.string().optional(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    url: z.string().optional(),
  }),
});

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

export const createSageInterviewInputSchema = z.object({
  sageId: z.number(),
  purpose: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
});

export type CreateSageInterviewInput = z.infer<
  typeof createSageInterviewInputSchema
>;

// ===== Processing Step Definitions =====

export const SAGE_PROCESSING_STEPS = {
  PARSE_CONTENT: "parse_content",
  EXTRACT_KNOWLEDGE: "extract_knowledge",
  BUILD_MEMORY_DOCUMENT: "build_memory_document",
  ANALYZE_COMPLETENESS: "analyze_completeness",
  GENERATE_EMBEDDING: "generate_embedding",
} as const;

export type SageProcessingStep =
  (typeof SAGE_PROCESSING_STEPS)[keyof typeof SAGE_PROCESSING_STEPS];

// ===== Memory Document Structure =====

export interface MemoryDocumentStructure {
  profile: {
    name: string;
    domain: string;
    expertise: string[];
    language: string;
  };
  coreKnowledge: {
    [topicName: string]: {
      keyPoints: string[];
      insights: string[];
      experience: string[];
    };
  };
  conversationStyle: {
    tone: string;
    approach: string;
    signaturePhrases: string[];
  };
  knowledgeBoundaries: {
    strengths: string[];
    limitations: string[];
    learningAreas: string[];
  };
}

// ===== Extracted Memory Entry =====

export interface ExtractedMemory {
  content: string;
  category: string;
  tags: string[];
  importance: "high" | "medium" | "low";
  keyTakeaway: string;
}

// ===== Knowledge Analysis Result =====

export interface KnowledgeAnalysisResult {
  overallScore: number;
  dimensions: KnowledgeDimension[];
  knowledgeGaps: KnowledgeGapFromAnalysis[];
  strengths: string[];
  recommendations: string[];
  shouldInterview: boolean;
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

// ===== Memory Document Version Types =====

export type MemoryDocumentVersionSource = "initial" | "interview" | "manual";

export interface CreateMemoryDocumentVersionInput {
  sageId: number;
  content: string;
  source: MemoryDocumentVersionSource;
  sourceReference?: string;
  changeNotes?: string;
}

// ===== Helper Type Guards =====

export function isSageExtra(value: unknown): value is SageExtra {
  return typeof value === "object" && value !== null;
}

export function isSageInterviewExtra(
  value: unknown
): value is SageInterviewExtra {
  return typeof value === "object" && value !== null;
}
