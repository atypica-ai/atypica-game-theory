#!/usr/bin/env tsx
// Migrate interview project questions from extra.questions to top-level questions field
// Usage: pnpm tsx scripts/archive/legacy/2025-12/migrate-questions-to-top-level.ts

import { InterviewProjectExtra, InterviewProjectQuestion } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "../../../mock-server-only";

async function main() {
  console.log("🚀 Starting migration: extra.questions → questions field...\n");

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find all interview projects
  const allProjects = await prisma.interviewProject.findMany({
    select: {
      id: true,
      questions: true,
      extra: true,
    },
  });

  console.log(`📊 Found ${allProjects.length} interview projects\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const project of allProjects) {
    try {
      // Get existing extra or create empty object
      const currentExtra =
        (project.extra as InterviewProjectExtra & {
          questions?: InterviewProjectQuestion[];
        }) || {};

      // Check if extra.questions exists
      const extraQuestions = currentExtra.questions;

      // Skip if no questions in extra or if questions already exist at top level
      if (!extraQuestions || !Array.isArray(extraQuestions) || extraQuestions.length === 0) {
        console.log(
          `⏭️  Project ${project.id}: No questions in extra or already migrated, skipping`,
        );
        skippedCount++;
        continue;
      }

      // Check if top-level questions already has data
      const topLevelQuestions = project.questions as InterviewProjectQuestion[] | null;
      if (topLevelQuestions && Array.isArray(topLevelQuestions) && topLevelQuestions.length > 0) {
        console.log(
          `⚠️  Project ${project.id}: Top-level questions already exists with ${topLevelQuestions.length} items, removing extra.questions`,
        );
        // Only remove extra.questions, don't overwrite top-level questions
        const { questions: _, ...restExtra } = currentExtra;
        await prisma.interviewProject.update({
          where: { id: project.id },
          data: {
            extra: restExtra,
          },
        });
        migratedCount++;
        continue;
      }

      // Prepare updated extra - remove questions field
      const { questions: _, ...updatedExtra } = currentExtra;

      // Update project: move questions to top level and remove from extra
      await prisma.interviewProject.update({
        where: { id: project.id },
        data: {
          questions: extraQuestions,
          extra: updatedExtra,
        },
      });

      console.log(
        `✅ Project ${project.id}: Migrated ${extraQuestions.length} questions to top-level field`,
      );
      migratedCount++;
    } catch (error) {
      console.error(`❌ Project ${project.id}: Migration failed -`, error);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 Migration Summary:");
  console.log("=".repeat(60));
  console.log(`Total projects: ${allProjects.length}`);
  console.log(`✅ Migrated: ${migratedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
