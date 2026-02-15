// @ts-nocheck

import "./mock-server-only";

import { loadEnvConfig } from "@next/env";

async function processAttachmentFile(fileId: number) {
  const { parseAttachmentText } = await import("@/lib/attachments/processing");
  const { rootLogger } = await import("@/lib/logging");
  const { prisma } = await import("@/prisma/prisma");
  const logger = rootLogger.child({ script: "process-attachment-files", fileId });

  const file = await prisma.attachmentFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    logger.warn({ msg: "File not found", fileId });
    return { success: false, fileId, reason: "not_found" };
  }

  try {
    await parseAttachmentText(fileId);
    logger.info({ msg: "Processed", fileId, fileName: file.name });
    return { success: true, fileId };
  } catch (error) {
    logger.error({ msg: "Failed", fileId, error: (error as Error).message });
    return { success: false, fileId, error: (error as Error).message };
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const { rootLogger } = await import("@/lib/logging");
  const logger = rootLogger.child({ script: "process-attachment-files" });
  const { prisma } = await import("@/prisma/prisma");

  const args = process.argv.slice(2);
  let files: { id: number }[];

  if (args.length > 0) {
    const ids = args[0]
      .split(/\s+/)
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      logger.error("No valid IDs provided");
      process.exit(1);
    }

    logger.info({ msg: "Processing specific files", ids });
    files = ids.map((id) => ({ id }));
  } else {
    files = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM "AttachmentFile"
      WHERE "mimeType" IN ('application/pdf', 'text/plain', 'text/csv')
        AND (
          "extra"::jsonb->>'compressedText' IS NULL
          OR "extra"::jsonb->>'compressedText' = ''
        )
        AND (
          "extra"::jsonb->>'error' IS NULL
          OR "extra"::jsonb->>'error' = ''
        )
      ORDER BY "createdAt" DESC
    `;

    logger.info({ msg: "Found files to process", count: files.length });
  }

  if (files.length === 0) {
    logger.info("No files to process");
    return;
  }

  const results = [];
  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);
    logger.info({
      msg: "Processing batch",
      batch: i / 10 + 1,
      total: Math.ceil(files.length / 10),
    });
    const batchResults = await Promise.all(batch.map((f) => processAttachmentFile(f.id)));
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success).length;
  logger.info({
    msg: "Done",
    total: results.length,
    successful,
    failed: results.length - successful,
  });
}

main()
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })
  .finally(() => process.exit());
