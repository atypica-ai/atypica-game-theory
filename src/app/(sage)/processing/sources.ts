import "server-only";

import { parsePDFToText, parseURLToText } from "@/ai/reader";
import { StatReporter } from "@/ai/tools/types";
import { SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { compressText } from "@/lib/attachments/processing";
import { SageSource } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { Logger } from "pino";

/**
 * Process all pending sources for a sage
 * Just extracts text from files/urls/text sources
 */
export async function processSageSources({
  sageId,
  logger,
  statReport,
  abortSignal,
}: {
  sageId: number;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}): Promise<void> {
  // Get all sources without extracted text
  const pendingSources = (
    await prisma.sageSource.findMany({
      where: {
        sageId,
        extractedText: "",
      },
      select: { id: true, content: true, extra: true },
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
      await processSingleSource({
        source,
        logger: logger.child({ sourceId: source.id }),
        statReport,
        abortSignal,
      });
    } catch (error) {
      logger.error({ msg: "Failed to process source", sourceId: source.id, error });
      // Continue with other sources even if one fails
    }
  }

  logger.info({ msg: "Source processing completed" });
}

/**
 * Process a single source to extract text
 * Step 1: Extract text from source content
 * Step 2: Compress text ⚠️ 和 AI Study 压缩附件使用一样的算法
 */
async function processSingleSource({
  source,
  logger,
  statReport,
  abortSignal,
}: {
  source: Pick<SageSource, "id"> & {
    content: SageSourceContent;
    extra: SageSourceExtra;
  };
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}): Promise<string> {
  try {
    waitUntil(
      mergeExtra({
        tableName: "SageSource",
        id: source.id,
        extra: { processing: true, error: null } satisfies SageSourceExtra,
      }),
    );

    let fullText: string;
    let title: string | null = null;

    switch (source.content.type) {
      case "text":
        fullText = source.content.text.trim() || "";
        // Generate title from first line or beginning of text
        title = fullText.substring(0, 100).split("\n")[0] || "Text Source";
        break;
      case "file":
        const { objectUrl, name, mimeType } = source.content;
        if (mimeType === "application/pdf") {
          fullText = await parsePDFToText({ name, objectUrl, mimeType });
          await statReport("tokens", 1000, { reportedBy: "process single source", type: "file" }); // 固定消耗 1000 tokens
        } else {
          throw new Error(`Unsupported file type: ${mimeType}`);
        }
        title = name || "File Source";
        break;
      case "url":
        const { url } = source.content;
        fullText = await parseURLToText({ url });
        await statReport("tokens", 1000, { reportedBy: "process single source", type: "url" }); // 固定消耗 1000 tokens
        // Extract title from first line or use URL
        title = fullText.substring(0, 100).split("\n")[0] || url;
        break;
      default:
        throw new Error(`Unknown source type: ${source.content.type}`);
    }

    logger.info({
      msg: "Source pricessing, full text extracted, starting text compression",
      length: fullText.length,
    });
    const compressedText = await compressText({
      fullText,
      logger,
      abortSignal,
    });

    // Update source with extracted text and title
    await prisma.sageSource.update({
      where: { id: source.id },
      data: {
        extractedText: compressedText,
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
      length: compressedText.length,
    });

    return compressedText;
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
