/**
 * Backfill user memory from their study logs
 *
 * This script finds users without memory and generates initial memory
 * by processing their latest 3 completed studies (analysts with studyLog).
 */
import "./mock-server-only";

import { convertToModelMessages, type ModelMessage } from "ai";
import { convertDBMessagesToAIMessages } from "../src/ai/messageUtils";
import { updateMemory } from "../src/app/(memory)/lib/updateMemory";
import { StudyToolName } from "../src/app/(study)/tools/types";
import { rootLogger } from "../src/lib/logging";
import { prisma } from "../src/prisma/prisma";

const logger = rootLogger.child({ script: "backfill-user-memory" });

async function main() {
  logger.info("Starting user memory backfill...");

  // Step 1: Find users without memory (no Memory record OR core is empty)
  const usersWithoutMemory = await prisma.$queryRaw<{ id: number }[]>`
    SELECT u.id
    FROM "User" u
    LEFT JOIN "Memory" m ON m."userId" = u.id
    WHERE m.id IS NULL OR m.core = ''
    GROUP BY u.id
  `;

  logger.info({
    msg: "Found users without memory",
    count: usersWithoutMemory.length,
  });

  let processedCount = 0;
  let skippedCount = 0;

  for (const { id: userId } of usersWithoutMemory) {
    logger.info({ msg: "Processing user", userId });

    try {
      // Step 2: Get latest 3 analysts with studyLog for this user
      const analysts = await prisma.analyst.findMany({
        where: {
          userId,
          studyLog: { not: "" },
          studyUserChatId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          studyLog: true,
          studyUserChatId: true,
        },
      });

      if (analysts.length === 0) {
        logger.info({
          msg: "No analysts with studyLog found, skipping user",
          userId,
        });
        skippedCount++;
        continue;
      }

      logger.info({
        msg: "Found analysts with studyLog",
        userId,
        analystCount: analysts.length,
        analystIds: analysts.map((a) => a.id),
      });

      // Step 3-7: Process each analyst's messages and update memory
      for (const analyst of analysts) {
        await processAnalystForMemory({ userId, analyst });
      }

      // Output final memory after processing all analysts
      const finalMemory = await prisma.memory.findFirst({
        where: { userId },
        orderBy: { version: "desc" },
        select: { core: true, version: true },
      });

      console.log("\n" + "=".repeat(80));
      console.log(`USER ${userId} - FINAL MEMORY (version ${finalMemory?.version ?? 0}):`);
      console.log("=".repeat(80));
      console.log(finalMemory?.core || "(empty)");
      console.log("=".repeat(80) + "\n");

      processedCount++;
      logger.info({
        msg: "Successfully processed user",
        userId,
        analystCount: analysts.length,
        memoryVersion: finalMemory?.version,
        memoryLength: finalMemory?.core.length ?? 0,
      });
    } catch (error) {
      logger.error({
        msg: "Failed to process user",
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info({
    msg: "Memory backfill completed",
    total: usersWithoutMemory.length,
    processed: processedCount,
    skipped: skippedCount,
  });
}

async function processAnalystForMemory({
  userId,
  analyst,
}: {
  userId: number;
  analyst: {
    id: number;
    studyLog: string;
    studyUserChatId: number | null;
  };
}) {
  if (!analyst.studyUserChatId) {
    logger.warn({
      msg: "Analyst has no studyUserChatId, skipping",
      analystId: analyst.id,
    });
    return;
  }

  // Step 3: Read messages from UserChat
  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId: analyst.studyUserChatId },
    orderBy: { id: "asc" },
  });

  if (dbMessages.length === 0) {
    logger.warn({
      msg: "No messages found for analyst",
      analystId: analyst.id,
      userChatId: analyst.studyUserChatId,
    });
    return;
  }

  // Step 4: Convert DB messages to AI messages
  const aiMessages = convertToModelMessages(await convertDBMessagesToAIMessages(dbMessages));

  // Step 5: Filter messages (same logic as updateMemoryAfterStudyCompletion)
  const filteredUserMessages: ModelMessage[] = aiMessages.flatMap((message) => {
    if (message.role === "user") {
      const content =
        typeof message.content === "string"
          ? [{ type: "text", text: message.content }]
          : message.content.filter((content) => content.type === "text");
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else if (message.role === "assistant" && Array.isArray(message.content)) {
      const content = message.content.filter(
        (content) =>
          (content.type === "tool-call" || content.type === "tool-result") &&
          content.toolName === StudyToolName.requestInteraction,
      );
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else if (message.role === "tool") {
      const content = message.content.filter(
        (content) => content.toolName === StudyToolName.requestInteraction,
      );
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else {
      return [];
    }
  });

  // Step 6: Add studyLog as assistant message
  const conversationContext: ModelMessage[] = [
    ...filteredUserMessages,
    {
      role: "assistant",
      content: [
        { type: "text", text: "Study Log Generated" },
        { type: "text", text: analyst.studyLog },
      ],
    },
  ];

  // Step 7: Call updateMemory
  await updateMemory({
    userId,
    conversationContext,
    logger: logger.child({ operation: "updateMemory", analystId: analyst.id }),
  });

  logger.info({
    msg: "Processed analyst for memory update",
    analystId: analyst.id,
    messagesCount: dbMessages.length,
    filteredMessagesCount: filteredUserMessages.length,
  });
}

main()
  .then(() => {
    logger.info("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({
      msg: "Script failed",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
