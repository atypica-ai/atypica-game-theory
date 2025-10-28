import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { detectInputLanguage } from "@/lib/textUtils";
import type { ChatMessageAttachment, SageSourceContent } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { Locale } from "next-intl";
import {
  analyzeKnowledgeCompleteness,
  buildMemoryDocument,
  extractMemories,
  generateSageEmbedding,
  getSageById,
  processInitialContent,
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

    // Save Memory Document
    await prisma.sage.update({
      where: { id: sageId },
      data: { memoryDocument },
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
 * Parse attachments to extract text content
 * @deprecated - Not currently used, kept for future reference
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function parseAttachments(
  attachments: ChatMessageAttachment[],
  logger: typeof rootLogger,
): Promise<string> {
  const contentParts: string[] = [];

  for (const attachment of attachments) {
    try {
      // if (attachment.type === "text") {
      //   // Direct text input
      //   contentParts.push(attachment.content);
      // } else if (attachment.type === "url") {
      //   // URL content - fetch and extract
      //   contentParts.push(`[URL: ${attachment.name || attachment.content}]\n${attachment.content}`);
      // } else if (attachment.type === "file") {
      //   // File content - download and parse
      //   const fileContent = await parseFileAttachment(attachment, logger);
      //   contentParts.push(fileContent);
      // }
      // TODO: 要支持 text/url/file 三种类型，现在的 attachment 对象还不大够，ChatMessageAttachment 只是针对文件的，
      // 需要引入一个新的数据类型，其实格式就行了，然后是给导入用的
      const fileContent = await parseFileAttachment(attachment, logger);
      contentParts.push(fileContent);
    } catch (error) {
      logger.error({
        msg: "Failed to parse attachment",
        attachmentType: attachment.mimeType,
        error: (error as Error).message,
      });
      // Continue with other attachments
    }
  }

  return contentParts.join("\n\n---\n\n");
}

/**
 * Parse file attachment to extract text content
 */
async function parseFileAttachment(
  attachment: ChatMessageAttachment,
  logger: typeof rootLogger,
): Promise<string> {
  const { objectUrl, mimeType, name } = attachment;

  // Get signed URL and download file from S3
  const fileHttpUrl = await s3SignedUrl(objectUrl);
  let response: Response;

  // Use proxy for mainland deployment if needed
  if (getDeployRegion() === "mainland" && !/amazonaws\.com\.cn/.test(fileHttpUrl)) {
    response = await proxiedFetch(fileHttpUrl);
  } else {
    response = await fetch(fileHttpUrl);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file from S3: ${response.status} ${response.statusText}`);
  }

  // Handle different file types
  if (mimeType?.startsWith("text/")) {
    // Plain text files - read directly
    return await response.text();
  } else if (mimeType === "application/pdf" || mimeType?.includes("document")) {
    // For PDF/document files, we need AI to extract content
    const fileBuffer = await response.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Content}`;

    // Use AI to extract text from file
    const extractedText = await extractTextFromFile(dataUrl, name || "file", mimeType, logger);
    return extractedText;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Use AI to extract text from file (PDF, DOCX, etc.)
 */
async function extractTextFromFile(
  dataUrl: string,
  fileName: string,
  mimeType: string,
  logger: typeof rootLogger,
): Promise<string> {
  const locale = await detectInputLanguage({ text: fileName });

  let extractedText = "";

  await new Promise(async (resolve, reject) => {
    const { streamText } = await import("ai");

    const response = streamText({
      model: llm("gemini-2.5-flash"),
      providerOptions: defaultProviderOptions,

      system:
        locale === "zh-CN"
          ? `你是专业的文档解析助手。请提取文档中的所有文字内容，保持原有的结构和格式。
注意：
1. 保留所有重要信息
2. 保持原文的段落结构
3. 不要添加任何评论或说明
4. 直接输出提取的内容`
          : `You are a professional document parser. Please extract all text content from the document, maintaining the original structure and format.
Note:
1. Preserve all important information
2. Maintain original paragraph structure
3. Do not add any comments or explanations
4. Output the extracted content directly`,

      messages: [
        {
          role: "user",
          content: [{ type: "file", filename: fileName, data: dataUrl, mediaType: mimeType }],
        },
      ],

      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          extractedText += chunk.text;
        }
      },

      onFinish: () => {
        logger.info({
          msg: "File text extraction completed",
          fileName,
          contentLength: extractedText.length,
        });
        resolve(null);
      },

      onError: ({ error }) => {
        logger.error({
          msg: "File text extraction failed",
          fileName,
          error: (error as Error).message,
        });
        reject(error);
      },
    });

    response.consumeStream().catch((error: Error) => reject(error));
  });

  return extractedText;
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

    // Update sage with new Memory Document
    await prisma.sage.update({
      where: { id: sageId },
      data: {
        memoryDocument: updatedMemoryDocument,
      },
    });

    // Regenerate embedding
    const embedding = await generateSageEmbedding(updatedMemoryDocument);
    await prisma.$executeRaw`
      UPDATE "Sage"
      SET "embedding" = ${embedding}::halfvec(1024),
          "updatedAt" = NOW()
      WHERE "id" = ${sageId}
    `;

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
        // Download and parse file
        if ("objectUrl" in content && "name" in content && "mimeType" in content) {
          const { objectUrl, name, mimeType } = content;
          const fileUrl = await s3SignedUrl(objectUrl);

          logger.info({ msg: "Downloading file", name, mimeType });

          const response = await proxiedFetch(fileUrl, {
            region: getDeployRegion(),
          });
          const buffer = await response.arrayBuffer();

          // Parse based on mime type
          extractedText = await parseFileContent(buffer, mimeType, name);
          title = name || "File Source";
        } else {
          throw new Error("Invalid file source content");
        }
        break;

      case "url":
        // TODO: Implement URL fetching and parsing
        throw new Error("URL sources not yet implemented");

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
 * Parse file content based on MIME type
 */
async function parseFileContent(
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const { readFileContentAsText } = await import("@/lib/attachments/parse");

  return readFileContentAsText({
    buffer,
    mimeType,
    filename,
  });
}
