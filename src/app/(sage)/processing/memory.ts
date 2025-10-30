import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  createSageMemoryDocument,
  getPendingSageKnowledgeGaps,
  resolveSageKnowledgeGaps,
} from "@/app/(sage)/lib";
import { sageMemoryDocumentBuilderSystem } from "@/app/(sage)/prompt";
import { SageExtra } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { Sage } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject, streamText } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";

/**
 * Extract knowledge and build memory document from completed sources
 */
export async function extractKnowledgeOnly({
  sageId,
  locale,
}: {
  sageId: number;
  locale: Locale;
}): Promise<void> {
  const logger = rootLogger.child({ sageId });
  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "extractKnowledgeOnly is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    const sage = await prisma.sage
      .findUniqueOrThrow({
        where: { id: sageId },
      })
      .then(({ expertise, extra, ...sage }) => ({
        ...sage,
        expertise: expertise as string[],
        extra: extra as SageExtra,
      }));

    // Get all completed sources
    const completedSources = await prisma.sageSource.findMany({
      where: {
        sageId,
        extractedText: {
          not: "",
        },
      },
      orderBy: { id: "asc" },
    });

    if (completedSources.length === 0) {
      throw new Error("No sources were successfully processed");
    }

    logger.info({
      msg: "Extracting knowledge from sage sources",
      sourcesCount: completedSources.length,
    });

    // Step 1: Generate suggested categories
    const suggestedCategories = await generateSuggestedCategories({
      sage,
      sageSources: completedSources,
      locale,
      statReport,
      logger,
    });

    // Update expertise with suggested categories
    await prisma.sage.update({
      where: { id: sageId },
      data: { expertise: suggestedCategories },
    });

    // Step 2: Build Memory Document (internal two-step streaming)

    const allExtractedTexts = completedSources
      .map((s) => s.extractedText)
      .filter((text): text is string => !!text);
    const rawContent = allExtractedTexts.join("\n\n---\n\n");

    const memoryDocument = await buildMemoryDocument({
      sage,
      rawContent,
      locale,
      statReport,
      logger,
    });

    // Save Memory Document as first version
    await createSageMemoryDocument({
      sageId,
      content: memoryDocument,
      source: {
        type: "initial",
      },
      lastVersion: 0,
      changeNotes: "Initial memory document from sources",
    });

    logger.info({ msg: "Knowledge extraction completed successfully" });
  } catch (error) {
    logger.error({
      msg: "Knowledge extraction failed",
      error: (error as Error).message,
    });
    throw error;
  }
}

const suggestedCategoriesSchema = z.object({
  categories: z
    .array(z.string())
    .describe("Suggested topic categories for organizing the knowledge (3-10 categories)"),
});

/**
 * Generate suggested categories for organizing knowledge
 */
async function generateSuggestedCategories({
  sage,
  sageSources,
  locale,
  statReport,
  logger,
}: {
  sage: Pick<Sage, "name" | "domain" | "userId">;
  sageSources: { extractedText: string }[];
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<string[]> {
  const allExtractedTexts = sageSources
    .map((s) => s.extractedText)
    .filter((text): text is string => !!text);
  const rawContent = allExtractedTexts.join("\n\n---\n\n");

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

  if (result.usage.totalTokens) {
    const totalTokens = result.usage.totalTokens;
    await statReport("tokens", totalTokens, {
      reportedBy: "generate categories",
    });
  }

  logger.info({
    msg: "Generated categories from sage sources",
    categoriesCount: result.object.categories.length,
  });

  return result.object.categories;
}

/**
 * Build Memory Document from raw content (two-step process with streaming)
 * Step 1: Clean and extract content with Gemini (large context)
 * Step 2: Build structured document with Claude
 */
export async function buildMemoryDocument({
  sage,
  rawContent,
  locale,
  statReport,
  logger,
}: {
  sage: Pick<Sage, "name" | "domain" | "userId" | "locale"> & { expertise: string[] };
  rawContent: string;
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<string> {
  // Step 1: Clean and extract content with Gemini
  logger.info({ msg: "Step 1: Cleaning content with Gemini" });

  const cleaningPrompt =
    locale === "zh-CN"
      ? `请清洗和整理以下原始内容，提取关键信息：

${rawContent}

要求：
- 移除无关内容和噪音
- 保留所有有价值的知识点
- 整理成清晰的文本格式
- 保持原有的逻辑结构

只输出清洗后的内容，不要添加额外说明。`
      : `Clean and organize the following raw content, extract key information:

${rawContent}

Requirements:
- Remove irrelevant content and noise
- Retain all valuable knowledge points
- Organize into clear text format
- Maintain original logical structure

Output only the cleaned content without additional explanations.`;

  let extractedContent = "";
  const cleaningResponse = streamText({
    model: llm("gemini-2.5-flash"),
    prompt: cleaningPrompt,
    maxRetries: 3,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        extractedContent += chunk.text;
        logger.debug({
          msg: "buildMemoryDocument onChunk",
          stage: "cleaning",
          extractedContentLength: extractedContent.length,
        });
      }
    },
    onError: ({ error }) => {
      logger.error({
        msg: "buildMemoryDocument onError",
        stage: "cleaning",
        error: (error as Error).message,
      });
    },
    onFinish: async () => {
      //这一步成本很低，不统计 usage
      // await statReport("tokens", 0, {
      //   reportedBy: "build memory document",
      // });
      logger.info({
        msg: "buildMemoryDocument onFinish",
        stage: "cleaning",
        extractedContentLength: extractedContent.length,
      });
    },
  });

  await cleaningResponse.consumeStream();

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

  let memoryDocument = "";
  const buildingResponse = streamText({
    model: llm("claude-sonnet-4-5"),
    system: sageMemoryDocumentBuilderSystem({ sage, locale }),
    prompt: buildingPrompt,
    maxRetries: 3,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        memoryDocument += chunk.text;
        logger.debug({
          msg: "buildMemoryDocument",
          stage: "building",
          memoryDocumentLength: memoryDocument.length,
        });
      }
    },
    onError: ({ error }) => {
      logger.error({
        msg: "buildMemoryDocument onError",
        stage: "building",
        error: (error as Error).message,
      });
    },
    onFinish: async ({ usage }) => {
      if (usage.totalTokens) {
        await statReport("tokens", usage.totalTokens, {
          reportedBy: "build memory document",
        });
      }
      logger.info({
        msg: "buildMemoryDocument onFinish",
        stage: "building",
        memoryDocumentLength: memoryDocument.length,
      });
    },
  });

  await buildingResponse.consumeStream();

  logger.info({
    msg: "Memory Document built",
    documentLength: memoryDocument.length,
  });

  return memoryDocument;
}

/**
 * Update Memory Document from supplementary interview
 */
export async function updateMemoryDocumentFromInterview({
  sageId,
  interviewId,
  locale,
}: {
  sageId: number;
  interviewId: number;
  locale: Locale;
}): Promise<void> {
  const logger = rootLogger.child({ sageId, interviewId });

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "updateMemoryDocumentFromInterview is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    const { sage, memoryDocument } = await prisma.sage
      .findUniqueOrThrow({
        where: { id: sageId },
        include: {
          memoryDocuments: {
            orderBy: { version: "desc" },
            take: 1,
            select: { content: true, version: true },
          },
        },
      })
      .then(({ memoryDocuments, expertise, extra, ...sage }) => ({
        sage: {
          ...sage,
          expertise: expertise as string[],
          extra: extra as SageExtra,
        },
        memoryDocument: memoryDocuments.length > 0 ? memoryDocuments[0] : undefined,
      }));

    const interview = await prisma.sageInterview.findUnique({
      where: { id: interviewId },
      include: {
        userChat: {
          include: {
            messages: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new Error(`Interview ${interviewId} not found`);
    }

    logger.info({
      msg: "Updating Memory Document from interview",
    });

    // Format interview transcript
    const interviewTranscript = interview.userChat.messages
      .map(convertDBMessageToAIMessage)
      .map(
        (msg) =>
          `${msg.role === "user" ? "Interviewee" : "Interviewer"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
      )
      .join("\n");

    // Rebuild Memory Document with new knowledge
    const updatedMemoryDocument = await buildMemoryDocument({
      sage,
      rawContent: `${memoryDocument?.content}\n\n# New Knowledge from Interview\n\n${interviewTranscript}`,
      locale,
      statReport,
      logger,
    });

    // Save as new version
    await createSageMemoryDocument({
      sageId,
      content: updatedMemoryDocument,
      source: {
        type: "interview",
        userChatToken: interview.userChat.token,
      },
      lastVersion: memoryDocument?.version ?? 0,
      changeNotes: `Updated from interview: ${interview.userChat.token}`,
    });

    // Analyze which gaps were resolved by this interview
    const pendingGaps = await getPendingSageKnowledgeGaps(sageId);
    const resolvedGapIds: number[] = [];

    // Simple heuristic: if the interview discusses the gap area, mark as resolved
    // TODO 现在是通过字符串匹配判断一个话题是否被讨论到，之后需要优化
    for (const gap of pendingGaps) {
      const transcriptLower = interviewTranscript.toLowerCase();
      const gapAreaLower = gap.area.toLowerCase();

      // Check if gap area is discussed in transcript
      if (
        transcriptLower.includes(gapAreaLower) ||
        transcriptLower.includes(gap.description.toLowerCase())
      ) {
        resolvedGapIds.push(gap.id);
      }
    }

    // Resolve gaps automatically
    if (resolvedGapIds.length > 0) {
      await resolveSageKnowledgeGaps(resolvedGapIds, {
        type: "interview",
        userChatToken: interview.userChat.token,
      });
      logger.info({
        msg: "Auto-resolved knowledge gaps from interview",
        resolvedCount: resolvedGapIds.length,
      });
    }

    logger.info({ msg: "Memory Document updated successfully" });
  } catch (error) {
    logger.error({
      msg: "Failed to update Memory Document from interview",
      error: (error as Error).message,
    });
    throw error;
  }
}
