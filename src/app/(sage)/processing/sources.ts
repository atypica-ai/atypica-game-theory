import "server-only";

import { parsePDFToText, parseURLToText } from "@/ai/reader";
import { SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { SageSource } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";

/**
 * Process all pending sources for a sage
 * Just extracts text from files/urls/text sources
 */
export async function processSourcesOnly(sageId: number): Promise<void> {
  const logger = rootLogger.child({ sageId });

  // Get all sources without extracted text
  const pendingSources = (
    await prisma.sageSource.findMany({
      where: {
        sageId,
        extractedText: "",
      },
    })
  ).map(({ content, extra, ...source }) => ({
    ...source,
    content: content as SageSourceContent,
    extra: extra as SageSourceExtra,
  }));

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
      await processSingleSource(source);
    } catch (error) {
      logger.error({ msg: "Failed to process source", sourceId: source.id, error });
      // Continue with other sources even if one fails
    }
  }

  logger.info({ msg: "Source processing completed" });
}

/**
 * Process a single source to extract text
 * Handles text, file, and url types
 */
async function processSingleSource(
  source: Omit<SageSource, "content" | "extra"> & {
    content: SageSourceContent;
    extra: SageSourceExtra;
  },
): Promise<string> {
  const logger = rootLogger.child({ sageId: source.sageId, sourceId: source.id });

  try {
    waitUntil(
      mergeExtra({
        tableName: "SageSource",
        id: source.id,
        extra: { processing: true } satisfies SageSourceExtra,
      }),
    );

    let extractedText: string;
    let title: string | null = null;

    switch (source.content.type) {
      case "text":
        extractedText = source.content.text.trim() || "";
        // Generate title from first line or beginning of text
        title = extractedText.substring(0, 100).split("\n")[0] || "Text Source";
        break;
      case "file":
        const { objectUrl, name, mimeType } = source.content;
        if (mimeType === "application/pdf") {
          extractedText = await parsePDFToText({ name, objectUrl, mimeType });
        } else {
          throw new Error(`Unsupported file type: ${mimeType}`);
        }
        title = name || "File Source";
        break;
      case "url":
        const { url } = source.content;
        extractedText = await parseURLToText({ url });
        // Extract title from first line or use URL
        title = extractedText.substring(0, 100).split("\n")[0] || url;
        break;
      default:
        throw new Error(`Unknown source type: ${source.content.type}`);
    }

    // Update source with extracted text and title
    await prisma.sageSource.update({
      where: { id: source.id },
      data: {
        extractedText,
        title,
      },
    });

    waitUntil(
      mergeExtra({
        tableName: "SageSource",
        id: source.id,
        extra: { processing: false } satisfies SageSourceExtra,
      }),
    );

    logger.info({
      msg: "Source processed successfully",
      title,
      textLength: extractedText.length,
    });

    return extractedText;
  } catch (error) {
    // Mark source as failed
    await mergeExtra({
      tableName: "SageSource",
      id: source.id,
      extra: {
        processing: false,
        error: (error as Error).message,
      } satisfies SageSourceExtra,
    });

    logger.error({
      msg: "Failed to process source",
      error: (error as Error).message,
    });

    throw error;
  }
}
