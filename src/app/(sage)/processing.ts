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
  processInitialContent,
  resolveSageKnowledgeGaps,
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

    // Get current processing status to determine where to resume
    const currentStep = sage.extra?.processing?.step;

    logger.info({
      msg: "Starting/Resuming sage processing",
      name: sage.name,
      domain: sage.domain,
      currentStep,
    });

    // Step 1: Process each source to extract text
    // Skip if we're already past this step
    if (!currentStep || currentStep === SAGE_PROCESSING_STEPS.PARSE_CONTENT) {
      await updateSageProcessingStatus({
        sageId,
        step: SAGE_PROCESSING_STEPS.PARSE_CONTENT,
        progress: 0.1,
      });

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
        logger.info({ msg: `Processing source ${i + 1}/${pendingSources.length}`, sourceId: source.id });

        try {
          await processSource(source.id, logger);
        } catch (error) {
          logger.error({ msg: "Failed to process source", sourceId: source.id, error });
          // Continue with other sources even if one fails
        }
      }
    }

    // Get all completed sources for next steps
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
      msg: "Sources ready for processing",
      contentLength: rawContent.length,
      completedSourcesCount: completedSources.length,
    });

    // Step 2: Process content and extract knowledge
    // Check if memory document already exists (indicates we're past this step)
    const needsExtraction = !sage.memoryDocument ||
      currentStep === SAGE_PROCESSING_STEPS.PARSE_CONTENT ||
      currentStep === SAGE_PROCESSING_STEPS.EXTRACT_KNOWLEDGE;

    let allCategories: string[] = sage.expertise;

    if (needsExtraction) {
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

      // Update expertise with suggested categories
      allCategories = processedContent.suggestedCategories;
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
      await createSageMemoryDocument({
        sageId,
        content: memoryDocument,
        source: "initial",
        changeNotes: "Initial memory document from sources",
      });
    }

    // Re-fetch sage to get latest memoryDocument
    const updatedSage = await getSageById(sageId);
    if (!updatedSage?.memoryDocument) {
      throw new Error("Memory document not available after extraction step");
    }

    // Step 4: Analyze knowledge completeness
    // Check if analysis already exists
    const needsAnalysis = !updatedSage.extra?.knowledgeAnalysis?.overallScore ||
      currentStep === SAGE_PROCESSING_STEPS.PARSE_CONTENT ||
      currentStep === SAGE_PROCESSING_STEPS.EXTRACT_KNOWLEDGE ||
      currentStep === SAGE_PROCESSING_STEPS.BUILD_MEMORY_DOCUMENT ||
      currentStep === SAGE_PROCESSING_STEPS.ANALYZE_COMPLETENESS;

    if (needsAnalysis) {
      await updateSageProcessingStatus({
        sageId,
        step: SAGE_PROCESSING_STEPS.ANALYZE_COMPLETENESS,
        progress: 0.7,
      });

      const analysis = await analyzeKnowledgeCompleteness({
        sage: {
          name: updatedSage.name,
          domain: updatedSage.domain,
          expertise: allCategories,
        },
        memoryDocument: updatedSage.memoryDocument,
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
          userId: updatedSage.userId,
        });
      }

      // Save analysis
      await updateSageKnowledgeAnalysis({ sageId, analysis });

      // Create knowledge gaps in database (only if they don't exist yet)
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
          }))
        );
      }
    }

    // Mark processing complete
    await updateSageProcessingStatus({
      sageId,
      step: SAGE_PROCESSING_STEPS.ANALYZE_COMPLETENESS,
      progress: 1,
    });

    logger.info({
      msg: "Sage processing completed successfully",
      overallScore: updatedSage.extra?.knowledgeAnalysis?.overallScore,
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
      if (transcriptLower.includes(gapAreaLower) ||
          transcriptLower.includes(gap.description.toLowerCase())) {
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
