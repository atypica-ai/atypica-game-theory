// @ts-nocheck

// Backfill personaPanelId from DiscussionTimeline to UserChat.context
//
// Problem: When discussions are created via panel projects, the UserChat that triggered
// the discussion doesn't get the personaPanelId written to its context. The DiscussionTimeline
// has the correct personaPanelId, but the parent UserChat is missing it.
//
// Strategy:
// 1. Load all DiscussionTimeline records (they all have personaPanelId)
// 2. For each, find the ChatMessage that contains the timeline token in parts/content
//    (with a ±2 hour time window to narrow the search)
// 3. From that ChatMessage, find the parent UserChat
// 4. If UserChat.context is missing personaPanelId, backfill it
//
// Usage:
//   pnpm tsx scripts/backfill-discussion-panel-to-userchat.ts --dry-run   (preview)
//   pnpm tsx scripts/backfill-discussion-panel-to-userchat.ts             (execute)

import "./mock-server-only";

import { loadEnvConfig } from "@next/env";
import type { UserChatContext } from "../src/app/(study)/context/types";

async function main() {
  console.log("🚀 Backfill personaPanelId from DiscussionTimeline to UserChat\n");

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  loadEnvConfig(process.cwd());
  const { prisma } = await import("../src/prisma/prisma");

  // 1. Load all DiscussionTimelines
  console.log("📊 Fetching DiscussionTimelines...");
  const timelines = await prisma.discussionTimeline.findMany({
    select: {
      id: true,
      token: true,
      personaPanelId: true,
      createdAt: true,
      personaPanel: { select: { userId: true } },
    },
    orderBy: { id: "asc" },
  });
  console.log(`Found ${timelines.length} discussion timelines\n`);

  const BATCH_SIZE = 10;
  let updated = 0;
  let merged = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  async function processTimeline(timeline: (typeof timelines)[number]) {
    // 2. Search ChatMessage for the timeline token within ±2 hour window
    const timeMin = new Date(timeline.createdAt.getTime() - 2 * 60 * 60 * 1000);
    const timeMax = new Date(timeline.createdAt.getTime() + 2 * 60 * 60 * 1000);

    // The timelineToken appears in tool invocation args stored in parts JSON
    // Use raw SQL for text search on the JSON column
    const userId = timeline.personaPanel.userId;
    const messages = await prisma.$queryRaw<{ id: number; userChatId: number }[]>`
      SELECT cm.id, cm."userChatId"
      FROM "ChatMessage" cm
      JOIN "UserChat" uc ON uc.id = cm."userChatId"
      WHERE uc."userId" = ${userId}
        AND cm."createdAt" BETWEEN ${timeMin} AND ${timeMax}
        AND cm.parts::text LIKE ${"%" + timeline.token + "%"}
      LIMIT 1
    `;

    if (messages.length === 0) {
      console.log(
        `  ⚠️  Timeline ${timeline.id} (${timeline.token}): No matching ChatMessage found`,
      );
      return "not_found" as const;
    }

    const userChatId = messages[0].userChatId;

    // 3. Check the UserChat
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId },
      select: { id: true, token: true, context: true, createdAt: true },
    });

    if (!userChat) {
      console.log(`  ⚠️  Timeline ${timeline.id}: UserChat ${userChatId} not found`);
      return "not_found" as const;
    }

    const context = (userChat.context || {}) as UserChatContext;

    // 4a. Already correct — skip silently
    if (context.personaPanelId === timeline.personaPanelId) {
      return "skipped" as const;
    }

    // 4b. Mismatch — merge timeline's Panel B into UserChat's Panel A, then delete Panel B
    if (context.personaPanelId) {
      const panelA = context.personaPanelId;
      const panelB = timeline.personaPanelId;
      const chatDate = userChat.createdAt.toISOString().slice(0, 10);

      console.log(
        `  🔀 Timeline ${timeline.id}: UserChat ${userChat.token} (${chatDate}) merging panelB=${panelB} → panelA=${panelA}`,
      );

      if (!isDryRun) {
        await prisma.$transaction(
          async (tx) => {
            // 1. Read both panels' personaIds
            const [targetPanel, sourcePanel] = await Promise.all([
              tx.personaPanel.findUniqueOrThrow({
                where: { id: panelA },
                select: { personaIds: true },
              }),
              tx.personaPanel.findUniqueOrThrow({
                where: { id: panelB },
                select: { personaIds: true },
              }),
            ]);
            const targetIds = targetPanel.personaIds as number[];
            const sourceIds = sourcePanel.personaIds as number[];

            // 2. Merge personaIds (deduplicated)
            const mergedIds = [...new Set([...targetIds, ...sourceIds])];
            await tx.personaPanel.update({
              where: { id: panelA },
              data: { personaIds: mergedIds },
            });

            // 3. Point this DiscussionTimeline to Panel A
            await tx.discussionTimeline.update({
              where: { id: timeline.id },
              data: { personaPanelId: panelA },
            });

            // 4. Delete Panel B only if no remaining references
            const [timelineRefs, interviewRefs, userChatRefs] = await Promise.all([
              tx.discussionTimeline.count({ where: { personaPanelId: panelB } }),
              tx.analystInterview.count({ where: { personaPanelId: panelB } }),
              tx.$queryRaw<{ count: bigint }[]>`
              SELECT COUNT(*)::bigint as count FROM "UserChat"
              WHERE context->>'personaPanelId' = ${String(panelB)}
            `.then((r) => Number(r[0].count)),
            ]);
            if (timelineRefs === 0 && interviewRefs === 0 && userChatRefs === 0) {
              await tx.personaPanel.delete({ where: { id: panelB } });
              console.log(`    🗑️  Deleted orphan panelB=${panelB}`);
            } else {
              console.log(
                `    ⚠️  panelB=${panelB} still referenced: ${timelineRefs} timelines, ${interviewRefs} interviews, ${userChatRefs} userChats — kept`,
              );
            }
          },
          { timeout: 10000 },
        );
      }

      return "merged" as const;
    }

    // 5. No personaPanelId on UserChat — backfill
    console.log(
      `  🔄 Timeline ${timeline.id} → UserChat ${userChat.token}: setting personaPanelId=${timeline.personaPanelId}`,
    );

    if (!isDryRun) {
      await prisma.userChat.update({
        where: { id: userChat.id },
        data: {
          context: {
            ...context,
            personaPanelId: timeline.personaPanelId,
          } satisfies UserChatContext,
        },
      });
    }

    return "updated" as const;
  }

  // Process in batches of 10, parallel within each batch
  for (let i = 0; i < timelines.length; i += BATCH_SIZE) {
    const batch = timelines.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(timelines.length / BATCH_SIZE);

    console.log(
      `\n📦 Batch ${batchNum}/${totalBatches} (timelines ${i + 1}-${Math.min(i + BATCH_SIZE, timelines.length)})`,
    );

    const results = await Promise.allSettled(batch.map(processTimeline));

    for (const result of results) {
      if (result.status === "fulfilled") {
        switch (result.value) {
          case "updated":
            updated++;
            break;
          case "merged":
            merged++;
            break;
          case "skipped":
            skipped++;
            break;
          case "not_found":
            notFound++;
            break;
        }
      } else {
        console.error(`  ❌ ${result.reason}`);
        errors++;
      }
    }

    console.log(
      `  Progress: ${Math.min(i + BATCH_SIZE, timelines.length)}/${timelines.length} | updated=${updated} merged=${merged} skipped=${skipped} notFound=${notFound} errors=${errors}`,
    );
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("✨ Backfill complete!");
  console.log("=".repeat(70));
  console.log(`Total timelines:     ${timelines.length}`);
  console.log(`Updated:             ${updated}`);
  console.log(`Merged:              ${merged}`);
  console.log(`Already correct:     ${skipped}`);
  console.log(`ChatMessage missing: ${notFound}`);
  console.log(`Errors:              ${errors}`);

  if (isDryRun) {
    console.log("\n🔍 This was a dry run. Run without --dry-run to apply changes.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
