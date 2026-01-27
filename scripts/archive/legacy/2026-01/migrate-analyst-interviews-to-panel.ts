#!/usr/bin/env tsx
// Migrate Analyst-based interviews to PersonaPanel-based interviews
// For each Analyst with interviews, create a PersonaPanel and update UserChat.context
// Usage:
//   pnpm tsx scripts/archive/legacy/2026-01/migrate-analyst-interviews-to-panel.ts --dry-run   (preview)
//   pnpm tsx scripts/archive/legacy/2026-01/migrate-analyst-interviews-to-panel.ts             (execute)

import { loadEnvConfig } from "@next/env";
import { UserChatContext } from "../../../../src/app/(study)/context/types";
import "../../../mock-server-only";

const BATCH_SIZE = 50;

async function main() {
  console.log("🚀 Starting Analyst interviews to PersonaPanel migration\n");

  // Check for dry-run flag
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("../../../../src/prisma/prisma");

  // Get all analysts with their study user chats
  console.log("📊 Fetching analysts...");
  const analysts = await prisma.analyst.findMany({
    select: {
      id: true,
      userId: true,
      studyUserChat: {
        select: {
          id: true,
          token: true,
          context: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${analysts.length} analysts\n`);

  // Statistics
  let processed = 0;
  let skipped = 0;
  let migrated = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < analysts.length; i += BATCH_SIZE) {
    const batch = analysts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(analysts.length / BATCH_SIZE);

    console.log(
      `\n📦 Processing batch ${batchNum}/${totalBatches} (analysts ${i + 1}-${Math.min(i + BATCH_SIZE, analysts.length)})`,
    );

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (analyst) => {
        // Check if analyst has study user chat
        if (!analyst.studyUserChat) {
          console.log(`  ⏭️  Analyst ${analyst.id}: No study user chat, skipping`);
          return { status: "skipped" as const, reason: "no_study_chat" };
        }

        const studyUserChat = analyst.studyUserChat;
        const context = (studyUserChat.context || {}) as UserChatContext;

        // Check if already migrated (idempotency)
        if (context.interviewPersonaPanelId) {
          console.log(
            `  ✓  Analyst ${analyst.id}: Already has PersonaPanel ${context.interviewPersonaPanelId}, skipping`,
          );
          return { status: "skipped" as const, reason: "already_migrated" };
        }

        // Find all interviews for this analyst
        const interviews = await prisma.analystInterview.findMany({
          where: { analystId: analyst.id },
          select: {
            id: true,
            personaId: true,
          },
        });

        // If no interviews, skip
        if (interviews.length === 0) {
          console.log(`  ⏭️  Analyst ${analyst.id}: No interviews, skipping`);
          return { status: "skipped" as const, reason: "no_interviews" };
        }

        // Collect unique personaIds
        const personaIds = [...new Set(interviews.map((i) => i.personaId))];

        console.log(
          `  🔄 Analyst ${analyst.id}: Migrating ${interviews.length} interviews with ${personaIds.length} personas`,
        );

        if (!isDryRun) {
          // Execute migration in transaction
          await prisma.$transaction(async (tx) => {
            // 1. Create PersonaPanel
            const personaPanel = await tx.personaPanel.create({
              data: {
                userId: analyst.userId,
                personaIds,
              },
            });

            // 2. Re-read UserChat within transaction for consistency
            const freshUserChat = await tx.userChat.findUniqueOrThrow({
              where: { id: studyUserChat.id },
              select: { context: true },
            });
            const freshContext = (freshUserChat.context || {}) as UserChatContext;

            // 3. Update UserChat.context with interviewPersonaPanelId
            await tx.userChat.update({
              where: { id: studyUserChat.id },
              data: {
                context: {
                  ...freshContext,
                  interviewPersonaPanelId: personaPanel.id,
                } satisfies UserChatContext,
              },
            });

            // 4. Update all AnalystInterview records with personaPanelId
            await tx.analystInterview.updateMany({
              where: {
                id: { in: interviews.map((i) => i.id) },
              },
              data: {
                personaPanelId: personaPanel.id,
              },
            });

            console.log(
              `  ✅ Analyst ${analyst.id}: Created PersonaPanel ${personaPanel.id}, updated ${interviews.length} interviews`,
            );
          });
        } else {
          console.log(
            `  [DRY RUN] Would create PersonaPanel with ${personaIds.length} personas and update ${interviews.length} interviews`,
          );
        }

        return { status: "migrated" as const };
      }),
    );

    // Aggregate results
    for (const result of results) {
      processed++;
      if (result.status === "fulfilled") {
        if (result.value.status === "migrated") {
          migrated++;
        } else {
          skipped++;
        }
      } else {
        errors++;
        console.error(`  ❌ Error - ${result.reason}`);
      }
    }

    // Progress summary after each batch
    console.log(
      `\n  Progress: ${processed}/${analysts.length} processed, ${migrated} migrated, ${skipped} skipped, ${errors} errors`,
    );
  }

  // Final summary
  console.log("\n" + "=".repeat(80));
  console.log("✨ Migration complete!");
  console.log("=".repeat(80));
  console.log(`Total analysts processed: ${processed}`);
  console.log(`Successfully migrated: ${migrated}`);
  console.log(`Skipped (already migrated or no interviews): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (isDryRun) {
    console.log("\n🔍 This was a dry run. Run without --dry-run to apply changes.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
