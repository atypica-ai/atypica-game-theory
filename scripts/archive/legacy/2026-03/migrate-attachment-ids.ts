/**
 * Migration script: Add IDs to existing attachments and prepend markers to first user messages.
 *
 * This script processes all study UserChats that have non-empty context.attachments:
 * 1. Assigns incremental IDs (1, 2, 3...) to each attachment
 * 2. Prepends [#N filename] markers to the first user message's text
 *
 * Features:
 * - Idempotent: skips chats where attachments already have IDs
 * - Resumable: use --start <id> to resume from a specific UserChat ID
 * - Parallel: processes 10 chats concurrently in batches
 *
 * Usage:
 *   pnpm tsx scripts/migrate-attachment-ids.ts [--dry-run] [--start <id>]
 */

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

async function main() {
  loadEnvConfig(process.cwd());

  const { prisma } = await import("@/prisma/prisma");

  const dryRun = process.argv.includes("--dry-run");
  const startIdx = process.argv.indexOf("--start");
  const startFromId = startIdx !== -1 ? Number(process.argv[startIdx + 1]) : 0;

  if (dryRun) console.log("DRY RUN MODE - no changes will be made");
  if (startFromId > 0) console.log(`Starting from UserChat ID > ${startFromId}`);

  // Find all study UserChats that have attachments in context.
  // The field may not exist at all (default "{}") or may be an empty array.
  // We fetch all study chats ordered by ID and filter in JS.
  const chats = await prisma.userChat.findMany({
    where: {
      kind: "study",
      ...(startFromId > 0 ? { id: { gt: startFromId } } : {}),
    },
    select: {
      id: true,
      token: true,
      context: true,
    },
    orderBy: { id: "asc" },
  });

  // Filter to those that actually have a non-empty attachments array
  const chatsWithAttachments = chats.filter((chat) => {
    const attachments = chat.context.attachments;
    return Array.isArray(attachments) && attachments.length > 0;
  });

  console.log(`Found ${chatsWithAttachments.length} study chats with attachments\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 10;
  const totalBatches = Math.ceil(chatsWithAttachments.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = chatsWithAttachments.slice(i * batchSize, (i + 1) * batchSize);
    const batchLabel = `Batch ${i + 1}/${totalBatches} (IDs ${batch[0].id}..${batch[batch.length - 1].id})`;
    console.log(batchLabel);

    const results = await Promise.allSettled(
      batch.map(async (chat) => {
        const attachments = chat.context.attachments!;

        // Idempotent: skip if already migrated
        if (typeof attachments[0]?.id === "number") {
          skipped++;
          return;
        }

        // 1. Assign IDs
        const attachmentsWithIds = attachments.map((att, idx) => ({
          ...att,
          id: idx + 1,
        }));

        // 2. Build markers
        const markers = attachmentsWithIds.map((a) => `[#${a.id} ${a.name}]`).join("\n");

        // 3. Find the first user message
        const firstMessage = await prisma.chatMessage.findFirst({
          where: { userChatId: chat.id, role: "user" },
          orderBy: { id: "asc" },
        });

        if (!firstMessage) {
          console.log(`  warn: Chat ${chat.id} (${chat.token}) - no user message, skipping`);
          skipped++;
          return;
        }

        if (dryRun) {
          console.log(`  [dry-run] Chat ${chat.id} - ${attachmentsWithIds.length} file(s): ${markers.replace(/\n/g, ", ")}`);
          updated++;
          return;
        }

        // 4. Update context with IDs
        await prisma.userChat.update({
          where: { id: chat.id },
          data: {
            context: {
              ...chat.context,
              attachments: attachmentsWithIds,
            },
          },
        });

        // 5. Prepend markers to first user message
        const firstTextPart = firstMessage.parts.find(
          (p): p is Extract<(typeof firstMessage.parts)[number], { type: "text" }> =>
            p.type === "text",
        );
        if (firstTextPart) {
          firstTextPart.text = `${markers}\n${firstTextPart.text}`;
          await prisma.chatMessage.update({
            where: { id: firstMessage.id },
            data: { parts: firstMessage.parts },
          });
        }

        console.log(`  updated: Chat ${chat.id} - ${attachmentsWithIds.length} file(s)`);
        updated++;
      }),
    );

    // Report batch errors
    for (const [idx, result] of results.entries()) {
      if (result.status === "rejected") {
        const chat = batch[idx];
        console.error(`  error: Chat ${chat.id} (${chat.token}) - ${result.reason}`);
        errors++;
      }
    }
  }

  console.log(
    `\nDone. ${dryRun ? "Would update" : "Updated"}: ${updated}, Skipped: ${skipped}, Errors: ${errors}`,
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
