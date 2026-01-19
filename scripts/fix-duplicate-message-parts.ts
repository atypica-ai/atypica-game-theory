// Fix duplicate message parts caused by append mode bug
//
// Background:
// Between 2026-01-19 00:05:34 and 2026-01-19 21:29:06, the message persistence
// used append mode which caused text and reasoning parts to accumulate duplicates
// on each Continue operation. Tool parts were already deduplicated by toolCallId,
// but text and reasoning parts were not.
//
// This script:
// 1. Finds all assistant messages created in that time window
// 2. Detects duplicate text/reasoning parts (by text field content)
// 3. Removes duplicates while preserving the correct order
// 4. Rebuilds content field using the same logic as persistentAIMessageToDB
//
// Usage:
//   pnpm tsx scripts/admin/fix-duplicate-message-parts.ts [--dry-run] [--verbose]

import { loadEnvConfig } from "@next/env";
import { InputJsonValue } from "../src/prisma/generated/internal/prismaNamespace";
import "./mock-server-only";

loadEnvConfig(process.cwd());

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Time window when the bug existed
const BUG_START = new Date("2026-01-19 00:05:34 +0800");
const BUG_END = new Date("2026-01-19 21:29:06 +0800");

interface Part {
  type: string;
  [key: string]: unknown;
}

interface TextPart extends Part {
  type: "text";
  text: string;
}

interface ReasoningPart extends Part {
  type: "reasoning";
  text: string;
}

function isTextPart(part: Part): part is TextPart {
  return part.type === "text" && "text" in part && typeof part.text === "string";
}

function isReasoningPart(part: Part): part is ReasoningPart {
  return part.type === "reasoning" && "text" in part && typeof part.text === "string";
}

/**
 * Rebuild content from parts (same logic as persistentAIMessageToDB)
 * content 字段在 v5 中其实没用了，但是兼容下，先保存
 */
function compatibleContent(parts: Part[]): string {
  return (
    parts
      .map((part) => (part.type === "text" || part.type === "reasoning" ? (part as any).text : ""))
      .filter((text) => text.trim().length > 0)
      .join("\n") || "[EMPTY]"
  );
}

/**
 * Deduplicate parts array
 * - Text parts (type === "text"): deduplicate by text field content
 * - Reasoning parts (type === "reasoning"): deduplicate by text field content
 * - Other parts: keep all (no deduplication)
 */
function deduplicateParts(parts: Part[]): Part[] {
  const seenTextContent = new Set<string>();
  const seenReasoningContent = new Set<string>();
  const result: Part[] = [];

  for (const part of parts) {
    if (isTextPart(part)) {
      // Text parts: deduplicate by text content
      if (!seenTextContent.has(part.text)) {
        seenTextContent.add(part.text);
        result.push(part);
      } else {
        if (VERBOSE) {
          console.log(`  Removing duplicate text part: "${part.text.slice(0, 50)}..."`);
        }
      }
    } else if (isReasoningPart(part)) {
      // Reasoning parts: deduplicate by text content
      if (!seenReasoningContent.has(part.text)) {
        seenReasoningContent.add(part.text);
        result.push(part);
      } else {
        if (VERBOSE) {
          console.log(`  Removing duplicate reasoning part: "${part.text.slice(0, 50)}..."`);
        }
      }
    } else {
      // All other parts: keep as-is (no deduplication)
      result.push(part);
    }
  }

  return result;
}

async function main() {
  const { prisma } = await import("../src/prisma/prisma");

  console.log(`=`.repeat(70));
  console.log(`Fix Duplicate Message Parts`);
  console.log(`=`.repeat(70));
  console.log(`Bug time window: ${BUG_START.toISOString()} - ${BUG_END.toISOString()}`);
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN (no changes will be made)" : "LIVE (will update database)"}`,
  );
  console.log(``);

  // First, get all message IDs in the bug time window
  const messageIds = await prisma.chatMessage.findMany({
    where: {
      role: "assistant",
      createdAt: {
        gte: BUG_START,
        lte: BUG_END,
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${messageIds.length} assistant messages in the time window\n`);

  if (messageIds.length === 0) {
    console.log("No messages to process. Exiting.");
    return;
  }

  let fixedCount = 0;
  let totalPartsRemoved = 0;

  // Process messages in parallel batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map((m) => m.id);

    console.log(
      `\nProcessing batch [${i + 1}-${Math.min(i + BATCH_SIZE, messageIds.length)}/${messageIds.length}] in parallel...`,
    );

    // Fetch batch of messages
    const messages = await prisma.chatMessage.findMany({
      where: { id: { in: batchIds } },
      orderBy: { id: "asc" },
    });

    // Process all messages in the batch in parallel
    const results = await Promise.all(
      messages.map(async (message, j) => {
        const globalIndex = i + j + 1;

        const parts = message.parts as unknown as Part[];

        if (!Array.isArray(parts) || parts.length === 0) {
          return {
            messageId: message.id,
            globalIndex,
            skipped: true,
            reason: "No parts",
          };
        }

        const originalPartsCount = parts.length;
        const dedupedParts = deduplicateParts(parts);
        const duplicatesRemoved = originalPartsCount - dedupedParts.length;

        if (duplicatesRemoved > 0) {
          if (!DRY_RUN) {
            await prisma.chatMessage.update({
              where: { id: message.id },
              data: {
                parts: dedupedParts as unknown as InputJsonValue,
                content: compatibleContent(dedupedParts),
              },
            });
          }

          return {
            messageId: message.id,
            messageIdStr: message.messageId,
            userChatId: message.userChatId,
            createdAt: message.createdAt,
            globalIndex,
            originalPartsCount,
            dedupedPartsCount: dedupedParts.length,
            duplicatesRemoved,
            parts: VERBOSE ? { before: parts, after: dedupedParts } : undefined,
            updated: !DRY_RUN,
          };
        }

        return {
          messageId: message.id,
          globalIndex,
          noDuplicates: true,
        };
      }),
    );

    // Print results
    for (const result of results) {
      console.log(`  [${result.globalIndex}/${messageIds.length}] Message ID: ${result.messageId}`);

      if ("skipped" in result) {
        console.log(`    → ${result.reason}, skipping`);
      } else if ("noDuplicates" in result) {
        console.log(`    → No duplicates found`);
      } else {
        fixedCount++;
        totalPartsRemoved += result.duplicatesRemoved;

        console.log(`    → messageId: ${result.messageIdStr}`);
        console.log(`    → User Chat ID: ${result.userChatId}`);
        console.log(`    → Created: ${result.createdAt.toISOString()}`);
        console.log(
          `    → Parts: ${result.originalPartsCount} → ${result.dedupedPartsCount} (removed ${result.duplicatesRemoved})`,
        );

        if (VERBOSE && result.parts) {
          console.log(`    → Part types (before):`, result.parts.before.map((p) => p.type).join(", "));
          console.log(`    → Part types (after):`, result.parts.after.map((p) => p.type).join(", "));
        }

        if (result.updated) {
          console.log(`    → ✅ Updated`);
        } else {
          console.log(`    → ⏭️  Skipped (dry run)`);
        }
      }
    }
  }

  console.log(`=`.repeat(70));
  console.log(`Summary:`);
  console.log(`  Total messages processed: ${messageIds.length}`);
  console.log(`  Messages with duplicates: ${fixedCount}`);
  console.log(`  Total parts removed: ${totalPartsRemoved}`);
  if (DRY_RUN) {
    console.log(``);
    console.log(`  ⚠️  This was a dry run. No changes were made.`);
    console.log(`  Run without --dry-run to apply changes.`);
  } else {
    console.log(`  ✅ All duplicates have been removed.`);
  }
  console.log(`=`.repeat(70));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
