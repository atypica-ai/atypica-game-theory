// @ts-nocheck

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

/**
 * Migration script: Rename fetchAttachmentFile to readAttachment
 *
 * This script migrates all chat messages from the past week to rename the
 * fetchAttachmentFile tool to readAttachment.
 *
 * Changes:
 * - Tool name: fetchAttachmentFile → readAttachment
 * - Applies to all tool-related parts (type starts with "tool-")
 *
 * Usage:
 * - Execute migration: npx tsx scripts/rename-fetchattachmentfile-to-readattachment.ts
 * - Dry run (preview changes): npx tsx scripts/rename-fetchattachmentfile-to-readattachment.ts --dry-run
 */

const OLD_TOOL_NAME = "fetchAttachmentFile";
const NEW_TOOL_NAME = "readAttachment";

async function migrateToolName(dryRun: boolean = false) {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");

  console.log("\n🔍 Starting tool name migration...\n");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}\n`);

  // Only process messages from the past 2 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 2);

  console.log(`📅 Processing messages since: ${oneWeekAgo.toISOString()}\n`);

  // Use raw SQL to filter messages containing "fetchAttachmentFile" in parts
  // Much faster than scanning all messages
  const messageIds = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "ChatMessage"
    WHERE "createdAt" >= ${oneWeekAgo}::timestamptz
      AND parts::text LIKE '%fetchAttachmentFile%'
    ORDER BY id ASC
  `;

  console.log(`📊 Found ${messageIds.length} messages containing "fetchAttachmentFile"\n`);

  if (messageIds.length === 0) {
    console.log("No messages to process. Exiting.");
    return;
  }

  let totalMessages = 0;
  let migratedMessages = 0;
  let totalPartsChanged = 0;

  // Process messages in batches of 100 (fewer messages now, can be larger batches)
  const BATCH_SIZE = 100;
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map((m) => m.id);

    console.log(
      `\n[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(messageIds.length / BATCH_SIZE)}] Processing ${batchIds.length} messages...`,
    );

    // Fetch batch
    const messages = await prisma.chatMessage.findMany({
      where: { id: { in: batchIds } },
      orderBy: { id: "asc" },
    });

    // Process each message
    for (const message of messages) {
      totalMessages++;

      const parts = (message.parts as any[]) || [];
      let modified = false;
      let partsChangedInMessage = 0;

      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];

        // Check if this part has toolName field
        if (part.type && typeof part.type === "string" && part.type.startsWith("tool-")) {
          if (part.toolName === OLD_TOOL_NAME) {
            parts[j] = {
              ...part,
              toolName: NEW_TOOL_NAME,
            };
            modified = true;
            partsChangedInMessage++;
          }
        }
      }

      if (modified) {
        migratedMessages++;
        totalPartsChanged += partsChangedInMessage;

        if (!dryRun) {
          await prisma.chatMessage.update({
            where: { id: message.id },
            data: { parts: parts as any },
          });
        }

        console.log(
          `  ✅ Message ${message.id}: Updated ${partsChangedInMessage} part(s) ${dryRun ? "(dry run)" : "(saved)"}`,
        );
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📈 Migration Summary:");
  console.log(`   Total messages processed: ${totalMessages}`);
  console.log(`   Messages with changes: ${migratedMessages}`);
  console.log(`   Total parts changed: ${totalPartsChanged}`);

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. No data was modified.");
    console.log("   Run without --dry-run flag to apply changes.\n");
  } else {
    console.log("\n✅ Migration completed successfully!\n");
  }

  console.log("=".repeat(70));

  await prisma.$disconnect();
}

// Main execution
const dryRun = process.argv.includes("--dry-run");

migrateToolName(dryRun)
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
