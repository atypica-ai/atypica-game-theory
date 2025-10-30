import "server-only";

import { SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
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
        const { objectUrl, name } = source.content;
        const fileUrl = await s3SignedUrl(objectUrl);
        logger.info({ msg: "Parsing file with Jina API", name });
        extractedText = await parseWithJinaAPI(fileUrl);
        title = name || "File Source";
        break;
      case "url":
        const { url } = source.content;
        logger.info({ msg: "Parsing URL with Jina API", url });
        extractedText = await parseWithJinaAPI(url);
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
