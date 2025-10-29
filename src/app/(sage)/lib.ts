import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import type { ChatMessageAttachment, Sage, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject, streamText } from "ai";
import { Locale } from "next-intl";
import { z } from "zod";
import {
  sageKnowledgeAnalysisSystem,
  sageMemoryDocumentBuilderSystem,
  sageMemoryExtractionSystem,
} from "./prompt";
import type { ExtractedMemory, KnowledgeAnalysisResult, SageExtra } from "./types";
import { SAGE_PROCESSING_STEPS } from "./types";

// ===== Content Processing Schemas =====

const suggestedCategoriesSchema = z.object({
  categories: z
    .array(z.string())
    .describe("Suggested topic categories for organizing the knowledge (3-10 categories)"),
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
 * Generate suggested categories for organizing knowledge
 */
export async function generateSuggestedCategories({
  sage,
  rawContent,
  locale,
}: {
  sage: { name: string; domain: string };
  rawContent: string;
  locale: Locale;
}): Promise<string[]> {
  const result = await generateObject({
    model: llm("gemini-2.5-flash"),
    schema: suggestedCategoriesSchema,
    system:
      locale === "zh-CN"
        ? `你是一个知识分类专家。根据专家 ${sage.name} 在 ${sage.domain} 领域的原始内容，提取3-10个核心主题分类。

分类要求：
- 准确反映专家的核心专长领域
- 分类粒度适中，不要过于宽泛或细致
- 使用简洁的术语（2-6个字）`
        : `You are a knowledge categorization expert. Based on the raw content from expert ${sage.name} in ${sage.domain}, extract 3-10 core topic categories.

Requirements:
- Accurately reflect the expert's core areas of expertise
- Categories should be moderately granular, not too broad or too specific
- Use concise terms (2-6 words)`,
    prompt: rawContent,
    maxRetries: 3,
  });

  return result.object.categories;
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
 * Build Memory Document from raw content (two-step process with streaming)
 * Step 1: Clean and extract content with Gemini (large context)
 * Step 2: Build structured document with Claude
 */
export async function buildMemoryDocument({
  sage,
  content,
  locale,
  onProgress,
}: {
  sage: {
    name: string;
    domain: string;
    expertise: string[];
    locale: string;
  };
  content: string;
  locale: Locale;
  onProgress?: (stage: "cleaning" | "building", progress: number) => void;
}): Promise<string> {
  const logger = rootLogger.child({ sageId: sage.name });

  // Step 1: Clean and extract content with Gemini
  logger.info({ msg: "Step 1: Cleaning content with Gemini" });

  const cleaningPrompt =
    locale === "zh-CN"
      ? `请清洗和整理以下原始内容，提取关键信息：

${content}

要求：
- 移除无关内容和噪音
- 保留所有有价值的知识点
- 整理成清晰的文本格式
- 保持原有的逻辑结构

只输出清洗后的内容，不要添加额外说明。`
      : `Clean and organize the following raw content, extract key information:

${content}

Requirements:
- Remove irrelevant content and noise
- Retain all valuable knowledge points
- Organize into clear text format
- Maintain original logical structure

Output only the cleaned content without additional explanations.`;

  const cleaningResult = streamText({
    model: llm("gemini-2.5-flash"),
    prompt: cleaningPrompt,
    maxRetries: 3,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta" && onProgress) {
        // Report progress during cleaning (we don't know exact progress, so just report activity)
        onProgress("cleaning", 0.5);
      }
    },
  });

  let extractedContent = "";
  for await (const chunk of cleaningResult.textStream) {
    extractedContent += chunk;
  }

  logger.info({
    msg: "Step 1 completed",
    extractedLength: extractedContent.length,
  });

  // Step 2: Build structured Memory Document with Claude
  logger.info({ msg: "Step 2: Building Memory Document with Claude" });

  const buildingPrompt =
    locale === "zh-CN"
      ? `请根据以下清洗后的内容，构建结构化的记忆文档：

${extractedContent}

生成完整的、结构化的记忆文档。`
      : `Build a structured Memory Document based on the following cleaned content:

${extractedContent}

Generate a complete, structured Memory Document.`;

  const buildingResult = streamText({
    model: llm("claude-sonnet-4-5"),
    system: sageMemoryDocumentBuilderSystem({ sage, locale }),
    prompt: buildingPrompt,
    maxRetries: 3,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta" && onProgress) {
        // Report progress during building
        onProgress("building", 0.5);
      }
    },
  });

  let memoryDocument = "";
  for await (const chunk of buildingResult.textStream) {
    memoryDocument += chunk;
  }

  logger.info({
    msg: "Step 2 completed",
    documentLength: memoryDocument.length,
  });

  return memoryDocument;
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
  // Add dimension name i18n keys
  const dimensionNameKeys = [
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

  const analysisData = result.object;

  // Add i18n keys to dimensions
  const dimensionsWithKeys = analysisData.dimensions.map((dim, index) => ({
    ...dim,
    nameKey: dimensionNameKeys[index] || dim.name,
  }));

  return {
    ...analysisData,
    dimensions: dimensionsWithKeys,
  };
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

  if (step === SAGE_PROCESSING_STEPS.ANALYZE_COMPLETENESS && progress === 1 && !error) {
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
    knowledgeGaps: analysis.knowledgeGaps,
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
 * Returns sage object and memoryDocument separately
 */
export async function getSageByToken(token: string): Promise<{
  sage: Omit<Sage, "expertise" | "attachments" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  memoryDocument: string | null;
} | null> {
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
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!sage) return null;

  const { memoryDocuments, ...sageData } = sage;

  return {
    sage: {
      ...sageData,
      expertise: sageData.expertise as string[],
      attachments: sageData.attachments as ChatMessageAttachment[],
      extra: sageData.extra as SageExtra,
    },
    memoryDocument: memoryDocuments[0]?.content ?? null,
  };
}

/**
 * Get sage by ID with type-safe extra field casting
 * Returns sage object and memoryDocument separately
 */
export async function getSageById(id: number): Promise<{
  sage: Omit<Sage, "expertise" | "attachments" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  memoryDocument: string | null;
} | null> {
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
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!sage) return null;

  const { memoryDocuments, ...sageData } = sage;

  return {
    sage: {
      ...sageData,
      expertise: sageData.expertise as string[],
      attachments: sageData.attachments as ChatMessageAttachment[],
      extra: sageData.extra as SageExtra,
    },
    memoryDocument: memoryDocuments[0]?.content ?? null,
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
  knowledgeGaps: Array<{
    area: string;
    severity: "critical" | "important" | "nice-to-have";
    description: string;
    impact: string;
    suggestedQuestions: string[];
  }>;
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

/**
 * Analyze conversation to detect knowledge gaps
 * Called after sage responds to user question
 */
export async function analyzeConversationForGaps({
  userMessage,
  aiResponse,
  sage,
  locale,
}: {
  userMessage: string;
  aiResponse: string;
  sage: { name: string; domain: string };
  locale: Locale;
}): Promise<
  Array<{
    area: string;
    severity: "critical" | "important" | "nice-to-have";
    description: string;
    impact: string;
  }>
> {
  const conversationGapSchema = z.object({
    hasGap: z.boolean().describe("Whether a knowledge gap was detected"),
    gaps: z
      .array(
        z.object({
          area: z.string().describe("Knowledge area with gap"),
          severity: z
            .enum(["critical", "important", "nice-to-have"])
            .describe("Severity of the gap"),
          description: z.string().describe("What's missing or inadequate"),
          impact: z.string().describe("Impact on expert's capability"),
          suggestedQuestions: z.array(z.string()).describe("Questions to fill this gap").max(3),
        }),
      )
      .describe("List of detected knowledge gaps")
      .optional(),
  });

  try {
    const result = await generateObject({
      model: llm("gemini-2.5-flash"), // Fast model for quick analysis
      schema: conversationGapSchema,
      system:
        locale === "zh-CN"
          ? `你是一个专业的知识完整度分析师。分析专家与用户的对话，识别专家回答中的知识空白。

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
知识空白的标志：
1. 专家明确表示不知道或不确定
2. 回答模糊、空泛，缺乏具体信息
3. 回避问题，转移话题
4. 回答明显不专业或错误
5. 缺少实例、数据、经验支撑

<Ignore>
- 正常的合理边界（如"这不在我的专业范围"）
- 需要更多上下文的追问（这是正常对话）
- 专家给出了合理、专业的回答
</Ignore>

<Output>
如果检测到知识空白，设置 hasGap=true 并列出gaps。
如果回答质量正常，设置 hasGap=false。
</Output>`
          : `You are a professional knowledge completeness analyst. Analyze the conversation between the expert and user to identify knowledge gaps in the expert's response.

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
Signs of knowledge gaps:
1. Expert explicitly states they don't know or are uncertain
2. Vague, generic answers lacking specific information
3. Avoiding the question, changing the subject
4. Obviously unprofessional or incorrect answers
5. Lack of examples, data, or experience to support claims

<Ignore>
- Normal reasonable boundaries (like "this is outside my expertise")
- Asking for more context (normal conversation flow)
- Expert provides reasonable, professional answers
</Ignore>

<Output>
If knowledge gap detected, set hasGap=true and list gaps.
If answer quality is normal, set hasGap=false.
</Output>`,
      prompt:
        locale === "zh-CN"
          ? `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

请分析上述对话，判断专家回答中是否存在知识空白。`
          : `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

Analyze the above conversation and determine if there are knowledge gaps in the expert's response.`,
      maxRetries: 2,
    });

    if (result.object.hasGap && result.object.gaps) {
      return result.object.gaps;
    }

    return [];
  } catch (error) {
    rootLogger.error({
      msg: "Failed to analyze conversation for gaps",
      error: (error as Error).message,
    });
    // Return empty array on error - don't block the conversation
    return [];
  }
}

/**
 * Create sage knowledge gaps in database
 */
export async function createSageKnowledgeGaps(
  gaps: Array<{
    sageId: number;
    area: string;
    description: string;
    severity: "critical" | "important" | "nice-to-have";
    impact: string;
    sourceType: "analysis" | "conversation" | "system_suggestion";
    sourceDescription: string;
    sourceReference?: string;
  }>,
) {
  if (gaps.length === 0) return [];

  const created = await prisma.sageKnowledgeGap.createMany({
    data: gaps,
  });

  rootLogger.info({
    msg: "Created sage knowledge gaps",
    count: created.count,
  });

  return created;
}

/**
 * Get pending sage knowledge gaps
 */
export async function getPendingSageKnowledgeGaps(sageId: number) {
  return prisma.sageKnowledgeGap.findMany({
    where: {
      sageId,
      status: "pending",
    },
    orderBy: [
      { severity: "desc" }, // critical first
      { createdAt: "asc" },
    ],
  });
}

/**
 * Resolve sage knowledge gaps
 */
export async function resolveSageKnowledgeGaps(
  gapIds: number[],
  resolvedBy: "interview" | "manual",
  interviewId?: number,
) {
  if (gapIds.length === 0) return;

  await prisma.sageKnowledgeGap.updateMany({
    where: {
      id: { in: gapIds },
    },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy,
      resolvedByInterviewId: interviewId,
    },
  });

  rootLogger.info({
    msg: "Resolved sage knowledge gaps",
    gapIds,
    resolvedBy,
    interviewId,
  });
}

/**
 * Delete sage knowledge gaps
 */
export async function deleteSageKnowledgeGaps(gapIds: number[]) {
  if (gapIds.length === 0) return;

  await prisma.sageKnowledgeGap.updateMany({
    where: {
      id: { in: gapIds },
    },
    data: {
      status: "deleted",
    },
  });

  rootLogger.info({
    msg: "Deleted sage knowledge gaps",
    gapIds,
  });
}

/**
 * Create a new sage memory document version with optimistic locking
 */
export async function createSageMemoryDocument({
  sageId,
  content,
  source,
  sourceReference,
  changeNotes,
}: {
  sageId: number;
  content: string;
  source: "initial" | "interview" | "manual";
  sourceReference?: string;
  changeNotes?: string;
}) {
  // Get the latest version number
  const latestVersion = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const newVersion = (latestVersion?.version ?? 0) + 1;

  // Create new version
  const version = await prisma.sageMemoryDocument.create({
    data: {
      sageId,
      version: newVersion,
      content,
      source,
      sourceReference,
      changeNotes,
    },
  });

  // Clean up old versions (keep only latest 20)
  const allVersions = await prisma.sageMemoryDocument.findMany({
    where: { sageId },
    orderBy: { version: "desc" },
    select: { id: true },
    skip: 20, // Skip the latest 20
  });

  if (allVersions.length > 0) {
    await prisma.sageMemoryDocument.deleteMany({
      where: {
        id: { in: allVersions.map((v) => v.id) },
      },
    });

    rootLogger.info({
      msg: "Cleaned up old memory document versions",
      sageId,
      deletedCount: allVersions.length,
    });
  }

  rootLogger.info({
    msg: "Created sage memory document version",
    sageId,
    version: newVersion,
    source,
  });

  return version;
}

/**
 * Get latest sage memory document version
 */
export async function getLatestSageMemoryDocument(sageId: number) {
  return prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });
}

/**
 * Get latest sage memory document content (convenience function)
 * Returns null if no memory document exists
 */
export async function getSageMemoryDocumentContent(sageId: number): Promise<string | null> {
  const latest = await getLatestSageMemoryDocument(sageId);
  return latest?.content ?? null;
}

/**
 * Get sage memory document version history
 */
export async function getSageMemoryDocumentHistory(sageId: number, limit = 20) {
  return prisma.sageMemoryDocument.findMany({
    where: { sageId },
    orderBy: { version: "desc" },
    take: limit,
  });
}
