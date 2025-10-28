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

export interface KnowledgeGap {
  area: string;
  severity: "critical" | "important" | "nice-to-have";
  description: string;
  impact: string;
  suggestedQuestions: string[];
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

// ===== Zod Schemas for Input Validation =====

export const createSageInputSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  locale: z.string().min(2).max(16),
  attachments: z.array(
    z.object({
      fileId: z.number().optional(),
      type: z.enum(["file", "url", "text"]),
      content: z.string(),
      name: z.string().optional(),
      mimeType: z.string().optional(),
    })
  ),
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
  knowledgeGaps: KnowledgeGap[];
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

// ===== Helper Type Guards =====

export function isSageExtra(value: unknown): value is SageExtra {
  return typeof value === "object" && value !== null;
}

export function isSageInterviewExtra(
  value: unknown
): value is SageInterviewExtra {
  return typeof value === "object" && value !== null;
}
