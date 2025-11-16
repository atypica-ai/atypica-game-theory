import "./mock-server-only";

import { loadEnvConfig } from "@next/env";

async function cleanMessageAttachments(analystId: number) {
  const { rootLogger } = await import("@/lib/logging");
  const { prisma } = await import("@/prisma/prisma");
  const logger = rootLogger.child({ script: "clean-study-message-attachments", analystId });

  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
    select: { id: true, studyUserChatId: true, attachments: true },
  });

  if (!analyst) {
    logger.warn({ msg: "Analyst not found" });
    return { success: false, analystId, reason: "not_found" };
  }

  if (!analyst.studyUserChatId) {
    logger.warn({ msg: "No study user chat associated" });
    return { success: false, analystId, reason: "no_study_chat" };
  }

  try {
    // 找到第一条消息
    const firstMessage = await prisma.chatMessage.findFirst({
      where: { userChatId: analyst.studyUserChatId },
      orderBy: { createdAt: "asc" },
    });

    if (!firstMessage) {
      logger.warn({ msg: "No message found" });
      return { success: false, analystId, reason: "no_message" };
    }

    // 清空 attachments
    await prisma.chatMessage.update({
      where: { id: firstMessage.id },
      data: { attachments: [] },
    });

    logger.info({
      msg: "Cleaned message attachments",
      messageId: firstMessage.id,
      studyUserChatId: analyst.studyUserChatId,
    });

    return { success: true, analystId, messageId: firstMessage.id };
  } catch (error) {
    logger.error({ msg: "Failed to clean", error: (error as Error).message });
    return { success: false, analystId, error: (error as Error).message };
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const { rootLogger } = await import("@/lib/logging");
  const logger = rootLogger.child({ script: "clean-study-message-attachments" });
  const { prisma } = await import("@/prisma/prisma");

  // 查询所有有 attachments 的 analyst
  const analysts = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "Analyst"
    WHERE "attachments" IS NOT NULL
      AND "attachments" != '[]'::jsonb
      AND "studyUserChatId" IS NOT NULL
    ORDER BY "createdAt" DESC
  `;

  logger.info({ msg: "Found analysts to process", count: analysts.length });

  if (analysts.length === 0) {
    logger.info("No analysts to process");
    return;
  }

  const results = [];
  for (let i = 0; i < analysts.length; i += 10) {
    const batch = analysts.slice(i, i + 10);
    logger.info({
      msg: "Processing batch",
      batch: i / 10 + 1,
      total: Math.ceil(analysts.length / 10),
    });
    const batchResults = await Promise.all(batch.map((a) => cleanMessageAttachments(a.id)));
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
