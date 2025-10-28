import { createTextEmbedding } from "@/ai/embedding";
import { llm } from "@/ai/provider";
import { generateToken } from "@/lib/utils";
import type { ChatMessageAttachment, Sage, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject, generateText } from "ai";
import { Locale } from "next-intl";
import { z } from "zod";
import {
  sageContentProcessingSystem,
  sageKnowledgeAnalysisSystem,
  sageMemoryDocumentBuilderSystem,
  sageMemoryExtractionSystem,
} from "./prompt";
import type { ExtractedMemory, KnowledgeAnalysisResult, KnowledgeGap, SageExtra } from "./types";
import { SAGE_PROCESSING_STEPS } from "./types";

// ===== Content Processing Schemas =====

const contentProcessingSchema = z.object({
  extractedContent: z.string().describe("Processed and cleaned text content"),
  suggestedCategories: z
    .array(z.string())
    .describe("Suggested topic categories for organizing the knowledge"),
  keyPoints: z.array(z.string()).describe("Key knowledge points identified in the content"),
  contentQuality: z.object({
    completeness: z.number().min(0).max(1).describe("Content completeness score (0-1)"),
    clarity: z.number().min(0).max(1).describe("Content clarity score (0-1)"),
    depth: z.number().min(0).max(1).describe("Content depth score (0-1)"),
  }),
  ambiguousAreas: z.array(z.string()).optional().describe("Areas that need clarification"),
});

const memoryExtractionSchema = z.object({
  memories: z.array(
    z.object({
      content: z.string().describe("Detailed memory content with full context"),
      category: z.string().describe("Topic category for this memory"),
      tags: z.array(z.string()).describe("Related tags (3-5 tags)"),
      importance: z.enum(["high", "medium", "low"]).describe("Importance level of this knowledge"),
      keyTakeaway: z.string().describe("One-sentence summary of this memory"),
    }),
  ),
  suggestedNewCategories: z
    .array(z.string())
    .describe("New categories discovered that don't fit existing ones"),
});

const knowledgeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("Overall knowledge completeness score"),
  dimensions: z.array(
    z.object({
      name: z.string().describe("Dimension name"),
      nameKey: z.string().optional().describe("i18n key for dimension name"),
      score: z.number().min(0).max(100).describe("Score for this dimension"),
      level: z.enum(["high", "medium", "low"]).describe("Level assessment"),
      assessment: z.string().describe("Detailed assessment explanation"),
      improvementSuggestions: z.array(z.string()).describe("Specific suggestions for improvement"),
    }),
  ),
  knowledgeGaps: z.array(
    z.object({
      area: z.string().describe("Knowledge area with gaps"),
      severity: z.enum(["critical", "important", "nice-to-have"]).describe("Severity of the gap"),
      description: z.string().describe("What's missing"),
      impact: z.string().describe("Impact on expert's capability"),
      suggestedQuestions: z.array(z.string()).describe("Questions to fill this gap"),
    }),
  ),
  strengths: z.array(z.string()).describe("What the expert knows well"),
  recommendations: z.array(z.string()).describe("Overall recommendations"),
  shouldInterview: z.boolean().describe("Whether supplementary interview is recommended"),
});

// ===== Token Generation =====

export function generateSageToken(): string {
  return generateToken();
}

// ===== Content Processing =====

/**
 * Process raw content (text/file) to extract structured knowledge
 */
export async function processInitialContent({
  sage,
  rawContent,
  locale,
}: {
  sage: { name: string; domain: string };
  rawContent: string;
  locale: Locale;
}): Promise<z.infer<typeof contentProcessingSchema>> {
  const result = await generateObject({
    model: llm("gemini-2.5-flash"),
    schema: contentProcessingSchema,
    system: sageContentProcessingSystem({ sage, locale }),
    prompt: rawContent,
    maxRetries: 3,
  });

  return result.object;
}

/**
 * Extract structured memories from processed content
 */
export async function extractMemories({
  sage,
  content,
  existingCategories = [],
  locale,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  content: string;
  existingCategories?: string[];
  locale: Locale;
}): Promise<{
  memories: ExtractedMemory[];
  suggestedNewCategories: string[];
}> {
  const result = await generateObject({
    model: llm("claude-sonnet-4"),
    schema: memoryExtractionSchema,
    system: sageMemoryExtractionSystem({ sage, existingCategories, locale }),
    prompt: content,
    maxRetries: 3,
  });

  return result.object;
}

/**
 * Build Memory Document from extracted memories
 */
export async function buildMemoryDocument({
  sage,
  content,
  locale,
}: {
  sage: {
    name: string;
    domain: string;
    expertise: string[];
    locale: string;
  };
  content: string;
  locale: Locale;
}): Promise<string> {
  const result = await generateText({
    model: llm("claude-sonnet-4-5"),
    system: sageMemoryDocumentBuilderSystem({ sage, locale }),
    prompt:
      locale === "zh-CN"
        ? `请根据以下内容构建记忆文档：

${content}

生成完整的记忆文档。`
        : `Build a Memory Document based on the following content:

${content}

Generate the complete Memory Document.`,
    maxRetries: 3,
  });

  return result.text;
}

/**
 * Analyze knowledge completeness of a Memory Document
 */
export async function analyzeKnowledgeCompleteness({
  sage,
  memoryDocument,
  locale,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  memoryDocument: string;
  locale: Locale;
}): Promise<KnowledgeAnalysisResult> {
  // Add dimension name i18n keys based on locale
  const dimensionNameKeys =
    locale === "zh-CN"
      ? [
          "sage.analysis.dimensions.foundationalTheory",
          "sage.analysis.dimensions.practicalExperience",
          "sage.analysis.dimensions.industryInsights",
          "sage.analysis.dimensions.problemSolving",
          "sage.analysis.dimensions.toolsAndMethodologies",
          "sage.analysis.dimensions.communicationSkills",
          "sage.analysis.dimensions.continuousLearning",
        ]
      : [
          "sage.analysis.dimensions.foundationalTheory",
          "sage.analysis.dimensions.practicalExperience",
          "sage.analysis.dimensions.industryInsights",
          "sage.analysis.dimensions.problemSolving",
          "sage.analysis.dimensions.toolsAndMethodologies",
          "sage.analysis.dimensions.communicationSkills",
          "sage.analysis.dimensions.continuousLearning",
        ];

  const result = await generateObject({
    model: llm("claude-sonnet-4"),
    schema: knowledgeAnalysisSchema,
    system: sageKnowledgeAnalysisSystem({ sage, locale }),
    prompt: memoryDocument,
    maxRetries: 3,
  });

  // Add i18n keys to dimensions
  const dimensionsWithKeys = result.object.dimensions.map((dim, index) => ({
    ...dim,
    nameKey: dimensionNameKeys[index] || dim.name,
  }));

  return {
    ...result.object,
    dimensions: dimensionsWithKeys,
  };
}

/**
 * Generate vector embedding for Memory Document
 */
export async function generateSageEmbedding(memoryDocument: string): Promise<number[]> {
  const embedding = await createTextEmbedding(memoryDocument, "retrieval.passage");

  return embedding;
}

/**
 * Update sage's processing status in extra field
 */
export async function updateSageProcessingStatus({
  sageId,
  step,
  progress,
  error,
}: {
  sageId: number;
  step?: string;
  progress?: number;
  error?: string;
}) {
  const updateData: Partial<SageExtra["processing"]> = {};

  if (step !== undefined) updateData.step = step;
  if (progress !== undefined) updateData.progress = progress;
  if (error !== undefined) updateData.error = error;

  if (step === SAGE_PROCESSING_STEPS.GENERATE_EMBEDDING && !error) {
    updateData.completedAt = new Date().toISOString();
  }

  // Use raw SQL to safely update nested JSON field
  await prisma.$executeRaw`
    UPDATE "Sage"
    SET "extra" = COALESCE("extra", '{}'::jsonb) || jsonb_build_object(
      'processing', COALESCE("extra"->'processing', '{}'::jsonb) || ${JSON.stringify(updateData)}::jsonb
    ),
    "updatedAt" = NOW()
    WHERE "id" = ${sageId}
  `;
}

/**
 * Update sage's knowledge analysis in extra field
 */
export async function updateSageKnowledgeAnalysis({
  sageId,
  analysis,
}: {
  sageId: number;
  analysis: KnowledgeAnalysisResult;
}) {
  const analysisData = {
    overallScore: analysis.overallScore,
    dimensions: analysis.dimensions,
    analyzedAt: new Date().toISOString(),
  };

  await prisma.$executeRaw`
    UPDATE "Sage"
    SET "extra" = COALESCE("extra", '{}'::jsonb) || jsonb_build_object(
      'knowledgeAnalysis', ${JSON.stringify(analysisData)}::jsonb
    ),
    "updatedAt" = NOW()
    WHERE "id" = ${sageId}
  `;
}

/**
 * Get sage by token with type-safe extra field casting
 */
export async function getSageByToken(token: string): Promise<
  | (Omit<Sage, "expertise" | "attachments" | "extra"> & {
      extra: SageExtra;
      expertise: string[];
      attachments: ChatMessageAttachment[];
      user: Pick<User, "id" | "name" | "email">;
    })
  | null
> {
  const sage = await prisma.sage.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!sage) return null;

  return {
    ...sage,
    expertise: sage.expertise as string[],
    attachments: sage.attachments as ChatMessageAttachment[],
    extra: sage.extra as SageExtra,
  };
}

/**
 * Get sage by ID with type-safe extra field casting
 */
export async function getSageById(id: number) {
  const sage = await prisma.sage.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!sage) return null;

  return {
    ...sage,
    expertise: sage.expertise as string[],
    attachments: sage.attachments as ChatMessageAttachment[],
    extra: sage.extra as SageExtra,
  };
}

/**
 * Generate interview plan for supplementary interview
 */
export async function generateInterviewPlan({
  sage,
  knowledgeGaps,
  locale,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  knowledgeGaps: KnowledgeGap[];
  locale: Locale;
}): Promise<{
  purpose: string;
  focusAreas: string[];
  questions: Array<{ question: string; purpose: string; followUps: string[] }>;
}> {
  const interviewPlanSchema = z.object({
    purpose: z.string().describe("Purpose of this supplementary interview"),
    focusAreas: z.array(z.string()).describe("Key focus areas for the interview"),
    questions: z.array(
      z.object({
        question: z.string().describe("Interview question"),
        purpose: z.string().describe("Purpose of asking this question"),
        followUps: z.array(z.string()).describe("Potential follow-up questions (2-3 questions)"),
      }),
    ),
  });

  const result = await generateObject({
    model: llm("claude-sonnet-4"),
    schema: interviewPlanSchema,
    system:
      locale === "zh-CN"
        ? `你是专业的访谈策划专家，负责为专家知识体系补充设计访谈计划。

<专家信息>
名称: ${sage.name}
领域: ${sage.domain}
已有专长: ${sage.expertise.join(", ")}
</专家信息>

<知识空白>
${knowledgeGaps.map((gap, i) => `${i + 1}. ${gap.area} (${gap.severity})\n   ${gap.description}\n   影响: ${gap.impact}`).join("\n\n")}
</知识空白>

<任务>
设计一个补充访谈计划，帮助填补上述知识空白。访谈计划应该：
1. 明确访谈目的
2. 确定重点关注领域（从知识空白中提炼）
3. 设计3-5个核心问题，每个问题配备2-3个追问
4. 问题应该开放式、具体，能够引导出深度知识
</任务>`
        : `You are a professional interview planning expert, responsible for designing interview plans to supplement expert knowledge systems.

<Expert Information>
Name: ${sage.name}
Domain: ${sage.domain}
Existing Expertise: ${sage.expertise.join(", ")}
</Expert Information>

<Knowledge Gaps>
${knowledgeGaps.map((gap, i) => `${i + 1}. ${gap.area} (${gap.severity})\n   ${gap.description}\n   Impact: ${gap.impact}`).join("\n\n")}
</Knowledge Gaps>

<Task>
Design a supplementary interview plan to help fill the above knowledge gaps. The interview plan should:
1. Clearly state the interview purpose
2. Identify key focus areas (extracted from knowledge gaps)
3. Design 3-5 core questions, each with 2-3 follow-up questions
4. Questions should be open-ended, specific, and able to elicit deep knowledge
</Task>`,
    prompt:
      locale === "zh-CN"
        ? "请生成补充访谈计划。"
        : "Please generate the supplementary interview plan.",
    maxRetries: 3,
  });

  return result.object;
}
