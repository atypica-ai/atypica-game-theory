import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import type { SageSourceContent } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { Locale } from "next-intl";
import {
  analyzeKnowledgeCompleteness,
  buildMemoryDocument,
  createSageKnowledgeGaps,
  createSageMemoryDocument,
  extractMemories,
  getPendingSageKnowledgeGaps,
  getSageById,
  resolveSageKnowledgeGaps,
  updateSageKnowledgeAnalysis,
} from "./lib";

/**
 * Process all pending sources for a sage
 * Just extracts text from files/urls/text sources
 */
export async function processSourcesOnly(sageId: number): Promise<void> {
  const logger = rootLogger.child({ sageId });

  try {
    const result = await getSageById(sageId);
    if (!result) {
      throw new Error(`Sage ${sageId} not found`);
    }

    // Get all pending sources
    const pendingSources = await prisma.sageSource.findMany({
      where: { sageId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    logger.info({
      msg: "Processing sources",
      pendingCount: pendingSources.length,
    });

    for (let i = 0; i < pendingSources.length; i++) {
      const source = pendingSources[i];
      logger.info({
        msg: `Processing source ${i + 1}/${pendingSources.length}`,
        sourceId: source.id,
      });

      try {
        await processSource(source.id, logger);
      } catch (error) {
        logger.error({ msg: "Failed to process source", sourceId: source.id, error });
        // Continue with other sources even if one fails
      }
    }

    logger.info({ msg: "Source processing completed" });
  } catch (error) {
    logger.error({
      msg: "Source processing failed",
      error: (error as Error).message,
    });
    throw error;
  }
}

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
    const result = await getSageById(sageId);
    if (!result) {
      throw new Error(`Sage ${sageId} not found`);
    }

    const { sage } = result;

    // Get all completed sources
    const completedSources = await prisma.sageSource.findMany({
      where: { sageId, status: "completed" },
      orderBy: { createdAt: "asc" },
    });

    if (completedSources.length === 0) {
      throw new Error("No sources were successfully processed");
    }

    const allExtractedTexts = completedSources
      .map((s) => s.extractedText)
      .filter((text): text is string => !!text);
    const rawContent = allExtractedTexts.join("\n\n---\n\n");

    logger.info({
      msg: "Extracting knowledge from sources",
      contentLength: rawContent.length,
      sourcesCount: completedSources.length,
    });

    // Step 1: Generate suggested categories
    const { generateSuggestedCategories } = await import("./lib");
    const suggestedCategories = await generateSuggestedCategories({
      sage: {
        name: sage.name,
        domain: sage.domain,
      },
      rawContent,
      locale,
    });

    logger.info({
      msg: "Generated categories",
      categoriesCount: suggestedCategories.length,
      categories: suggestedCategories,
    });

    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "generate categories",
        modelName: "gemini-2.5-flash",
        userId: sage.userId,
      });
    }

    // Update expertise with suggested categories
    await prisma.sage.update({
      where: { id: sageId },
      data: { expertise: suggestedCategories },
    });

    // Step 2: Build Memory Document (internal two-step streaming)
    const memoryDocument = await buildMemoryDocument({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: suggestedCategories,
        locale: sage.locale,
      },
      content: rawContent,
      locale,
    });

    logger.info({
      msg: "Memory Document built",
      documentLength: memoryDocument.length,
    });

    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "build memory document",
        modelName: "gemini-2.5-flash + claude-sonnet-4-5",
        userId: sage.userId,
      });
    }

    // Save Memory Document as first version
    await createSageMemoryDocument({
      sageId,
      content: memoryDocument,
      source: "initial",
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

/**
 * Analyze sage knowledge completeness
 */
export async function analyzeKnowledgeOnly({
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
      note: "analyzeKnowledgeOnly is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    const result = await getSageById(sageId);
    if (!result) {
      throw new Error(`Sage ${sageId} not found`);
    }

    const { sage, memoryDocument } = result;

    if (!memoryDocument) {
      throw new Error("Memory document not available");
    }

    logger.info({ msg: "Analyzing knowledge completeness" });

    const analysis = await analyzeKnowledgeCompleteness({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
      },
      memoryDocument,
      locale,
    });

    logger.info({
      msg: "Knowledge analysis completed",
      overallScore: analysis.overallScore,
      dimensionsCount: analysis.dimensions.length,
      knowledgeGapsCount: analysis.knowledgeGaps.length,
    });

    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "analyze knowledge",
        modelName: "claude-sonnet-4",
        userId: sage.userId,
      });
    }

    // Save analysis
    await updateSageKnowledgeAnalysis({ sageId, analysis });

    // Create knowledge gaps in database
    const existingGaps = await prisma.sageKnowledgeGap.count({
      where: { sageId, sourceType: "analysis" },
    });

    if (existingGaps === 0 && analysis.knowledgeGaps.length > 0) {
      await createSageKnowledgeGaps(
        analysis.knowledgeGaps.map((gap) => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          sourceType: "analysis",
          sourceDescription: "Initial knowledge analysis",
        })),
      );
    }

    logger.info({ msg: "Analysis completed successfully" });
  } catch (error) {
    logger.error({
      msg: "Analysis failed",
      error: (error as Error).message,
    });
    throw error;
  }
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

  try {
    // Get sage and interview data
    const result = await getSageById(sageId);
    if (!result) {
      throw new Error(`Sage ${sageId} not found`);
    }

    const { sage, memoryDocument } = result;

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
      messagesCount: interview.userChat.messages.length,
      focusAreas: interview.focusAreas,
    });

    // Format interview transcript
    const interviewTranscript = interview.userChat.messages
      .map((msg) => `${msg.role === "user" ? "User" : "Interviewer"}: ${msg.content}`)
      .join("\n");

    // Extract new knowledge from interview
    const newKnowledge = await extractMemories({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
      },
      content: interviewTranscript,
      existingCategories: sage.expertise,
      locale,
    });

    logger.info({
      msg: "New knowledge extracted from interview",
      memoriesCount: newKnowledge.memories.length,
    });

    // Rebuild Memory Document with new knowledge
    const updatedMemoryDocument = await buildMemoryDocument({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
        locale: sage.locale,
      },
      content: `${memoryDocument}\n\n# New Knowledge from Interview\n\n${interviewTranscript}`,
      locale,
    });

    // Save as new version
    await createSageMemoryDocument({
      sageId,
      content: updatedMemoryDocument,
      source: "interview",
      sourceReference: String(interviewId),
      changeNotes: `Updated from interview: ${interview.purpose}`,
    });

    // Analyze which gaps were resolved by this interview
    const pendingGaps = await getPendingSageKnowledgeGaps(sageId);
    const resolvedGapIds: number[] = [];

    // Simple heuristic: if the interview discusses the gap area, mark as resolved
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
      await resolveSageKnowledgeGaps(resolvedGapIds, "interview", interviewId);

      logger.info({
        msg: "Auto-resolved knowledge gaps from interview",
        resolvedCount: resolvedGapIds.length,
      });
    }

    // Update interview extra with findings
    await prisma.sageInterview.update({
      where: { id: interviewId },
      data: {
        extra: {
          findings: {
            keyDiscoveries: newKnowledge.memories
              .filter((m) => m.importance === "high")
              .map((m) => m.keyTakeaway),
            insights: newKnowledge.memories.map((m) => m.content).slice(0, 5),
            quotableExcerpts: [], // Could extract notable quotes
          },
          newMemoriesCount: newKnowledge.memories.length,
          memoryDocumentUpdated: true,
        },
      },
    });

    logger.info({
      msg: "Memory Document updated successfully",
      newMemoriesCount: newKnowledge.memories.length,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to update Memory Document from interview",
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Process a single source to extract text
 * Handles text, file, and url types
 */
async function processSource(sourceId: number, logger: typeof rootLogger): Promise<string> {
  const source = await prisma.sageSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  try {
    // Mark as processing
    await prisma.sageSource.update({
      where: { id: sourceId },
      data: { status: "processing" },
    });

    const content = source.content as SageSourceContent;
    let extractedText: string;
    let title: string | null = null;

    switch (source.type) {
      case "text":
        // Text is already ready
        if ("text" in content) {
          extractedText = content.text || "";
          // Generate title from first line or beginning of text
          title = extractedText.substring(0, 100).split("\n")[0] || "Text Source";
        } else {
          throw new Error("Invalid text source content");
        }
        break;

      case "file":
        // Download and parse file using Jina API
        if ("objectUrl" in content && "name" in content && "mimeType" in content) {
          const { objectUrl, name } = content;
          const fileUrl = await s3SignedUrl(objectUrl);

          logger.info({ msg: "Parsing file with Jina API", name });

          extractedText = await parseWithJinaAPI(fileUrl);
          title = name || "File Source";
        } else {
          throw new Error("Invalid file source content");
        }
        break;

      case "url":
        // Parse URL using Jina API
        if ("url" in content) {
          const { url } = content;

          logger.info({ msg: "Parsing URL with Jina API", url });

          extractedText = await parseWithJinaAPI(url);
          // Extract title from first line or use URL
          title = extractedText.substring(0, 100).split("\n")[0] || url;
        } else {
          throw new Error("Invalid URL source content");
        }
        break;

      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }

    // Update source with extracted text and title
    await prisma.sageSource.update({
      where: { id: sourceId },
      data: {
        status: "completed",
        extractedText,
        title,
      },
    });

    logger.info({
      msg: "Source processed successfully",
      sourceId,
      title,
      textLength: extractedText.length,
    });

    return extractedText;
  } catch (error) {
    // Mark source as failed
    await prisma.sageSource.update({
      where: { id: sourceId },
      data: {
        status: "failed",
        error: (error as Error).message,
      },
    });

    logger.error({
      msg: "Failed to process source",
      sourceId,
      error: (error as Error).message,
    });

    throw error;
  }
}

/**
 * Parse content (file or URL) using Jina API
 */
async function parseWithJinaAPI(url: string): Promise<string> {
  const response = await proxiedFetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    rootLogger.error({
      msg: "Jina API failed to parse content",
      url,
      status: response.status,
      error: errorText,
    });
    throw new Error(`Failed to parse content: ${response.statusText}`);
  }

  const text = await response.text();
  return text;
}
