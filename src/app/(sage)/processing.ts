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
  createKnowledgeGaps,
  createMemoryDocumentVersion,
  extractMemories,
  generateSageEmbedding,
  getPendingKnowledgeGaps,
  getSageById,
  processInitialContent,
  resolveKnowledgeGaps,
  updateSageKnowledgeAnalysis,
  updateSageProcessingStatus,
} from "./lib";
import { SAGE_PROCESSING_STEPS } from "./types";

/**
 * Background processing for new sage creation
 * Steps:
 * 1. Process each source (extract text from file/text/url)
 * 2. Extract knowledge from all sources
 * 3. Build Memory Document
 * 4. Analyze knowledge completeness
 * 5. Generate embedding
 */
export async function processNewSage({
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
      note: "processNewSage is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    // Get sage data
    const sage = await getSageById(sageId);

    if (!sage) {
      throw new Error(`Sage ${sageId} not found`);
    }

    // Get all pending sources
    const sources = await prisma.sageSource.findMany({
      where: { sageId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    logger.info({
      msg: "Starting sage processing",
      name: sage.name,
      domain: sage.domain,
      sourcesCount: sources.length,
    });

    // Step 1: Process each source to extract text
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.PARSE_CONTENT,
      progress: 0.1,
    });

    const allExtractedTexts: string[] = [];

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      logger.info({ msg: `Processing source ${i + 1}/${sources.length}`, sourceId: source.id });

      try {
        const extractedText = await processSource(source.id, logger);
        allExtractedTexts.push(extractedText);
      } catch (error) {
        logger.error({ msg: "Failed to process source", sourceId: source.id, error });
        // Continue with other sources even if one fails
      }
    }

    const rawContent = allExtractedTexts.join("\n\n---\n\n");

    logger.info({
      msg: "Attachments parsed",
      contentLength: rawContent.length,
    });

    // Step 2: Process content and extract knowledge
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.EXTRACT_KNOWLEDGE,
      progress: 0.3,
    });

    const processedContent = await processInitialContent({
      sage: {
        name: sage.name,
        domain: sage.domain,
      },
      rawContent,
      locale,
    });

    logger.info({
      msg: "Content processed",
      keyPointsCount: processedContent.keyPoints.length,
      suggestedCategories: processedContent.suggestedCategories.length,
      extractedContentLength: processedContent.extractedContent.length,
    });

    // Track tokens for content processing
    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "process content",
        modelName: "gemini-2.5-flash",
        userId: sage.userId,
      });
    }

    // Extract structured memories
    const extractedMemories = await extractMemories({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
      },
      content: processedContent.extractedContent,
      existingCategories: processedContent.suggestedCategories,
      locale,
    });

    logger.info({
      msg: "Memories extracted",
      memoriesCount: extractedMemories.memories.length,
      newCategories: extractedMemories.suggestedNewCategories.length,
    });

    // Track tokens for memory extraction
    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "extract memories",
        modelName: "claude-sonnet-4",
        userId: sage.userId,
      });
    }

    // Update expertise with categories
    const allCategories = [
      ...processedContent.suggestedCategories,
      ...extractedMemories.suggestedNewCategories,
    ];
    await prisma.sage.update({
      where: { id: sageId },
      data: { expertise: allCategories },
    });

    // Step 3: Build Memory Document
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.BUILD_MEMORY_DOCUMENT,
      progress: 0.5,
    });

    const memoryDocument = await buildMemoryDocument({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: allCategories,
        locale: sage.locale,
      },
      content: processedContent.extractedContent,
      locale,
    });

    logger.info({
      msg: "Memory Document built",
      documentLength: memoryDocument.length,
    });

    // Track tokens for memory document building
    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "build memory document",
        modelName: "claude-sonnet-4-5",
        userId: sage.userId,
      });
    }

    // Save Memory Document as first version
    await createMemoryDocumentVersion({
      sageId,
      content: memoryDocument,
      source: "initial",
      changeNotes: "Initial memory document from sources",
    });

    // Step 4: Analyze knowledge completeness
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.ANALYZE_COMPLETENESS,
      progress: 0.7,
    });

    const analysis = await analyzeKnowledgeCompleteness({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: allCategories,
      },
      memoryDocument,
      locale,
    });

    logger.info({
      msg: "Knowledge analysis completed",
      overallScore: analysis.overallScore,
      dimensionsCount: analysis.dimensions.length,
      knowledgeGapsCount: analysis.knowledgeGaps.length,
      shouldInterview: analysis.shouldInterview,
    });

    // Track tokens for knowledge analysis
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
    if (analysis.knowledgeGaps.length > 0) {
      await createKnowledgeGaps(
        analysis.knowledgeGaps.map((gap) => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          sourceType: "analysis",
          sourceDescription: "Initial knowledge analysis",
        }))
      );
    }

    // Step 5: Generate embedding
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.GENERATE_EMBEDDING,
      progress: 0.9,
    });

    const embedding = await generateSageEmbedding(memoryDocument);

    logger.info({
      msg: "Embedding generated",
      embeddingDimensions: embedding.length,
    });

    // Track tokens for embedding
    if (statReport) {
      await statReport("tokens", 0, {
        reportedBy: "generate embedding",
        modelName: "jina-embeddings-v3",
        userId: sage.userId,
      });
    }

    // Save embedding
    await prisma.$executeRaw`
      UPDATE "Sage"
      SET "embedding" = ${embedding}::halfvec(1024),
          "updatedAt" = NOW()
      WHERE "id" = ${sageId}
    `;

    // Mark processing complete
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.GENERATE_EMBEDDING,
      progress: 1,
    });

    logger.info({
      msg: "Sage processing completed successfully",
      overallScore: analysis.overallScore,
    });
  } catch (error) {
    logger.error({
      msg: "Sage processing failed",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    await updateSageProcessingStatus({
      sageId,
      error: (error as Error).message,
      progress: 0,
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
    const sage = await getSageById(sageId);
    if (!sage) {
      throw new Error(`Sage ${sageId} not found`);
    }

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
      content: `${sage.memoryDocument}\n\n# New Knowledge from Interview\n\n${interviewTranscript}`,
      locale,
    });

    // Save as new version
    await createMemoryDocumentVersion({
      sageId,
      content: updatedMemoryDocument,
      source: "interview",
      sourceReference: String(interviewId),
      changeNotes: `Updated from interview: ${interview.purpose}`,
    });

    // Regenerate embedding
    const embedding = await generateSageEmbedding(updatedMemoryDocument);
    await prisma.$executeRaw`
      UPDATE "Sage"
      SET "embedding" = ${embedding}::halfvec(1024),
          "updatedAt" = NOW()
      WHERE "id" = ${sageId}
    `;

    // Analyze which gaps were resolved by this interview
    const pendingGaps = await getPendingKnowledgeGaps(sageId);
    const resolvedGapIds: number[] = [];

    // Simple heuristic: if the interview discusses the gap area, mark as resolved
    for (const gap of pendingGaps) {
      const transcriptLower = interviewTranscript.toLowerCase();
      const gapAreaLower = gap.area.toLowerCase();

      // Check if gap area is discussed in transcript
      if (transcriptLower.includes(gapAreaLower) ||
          transcriptLower.includes(gap.description.toLowerCase())) {
        resolvedGapIds.push(gap.id);
      }
    }

    // Resolve gaps automatically
    if (resolvedGapIds.length > 0) {
      await resolveKnowledgeGaps(resolvedGapIds, "interview", interviewId);

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
async function processSource(
  sourceId: number,
  logger: typeof rootLogger,
): Promise<string> {
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
