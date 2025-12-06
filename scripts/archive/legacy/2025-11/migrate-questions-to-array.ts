#!/usr/bin/env tsx
// Migrate interview project questions from brief field to questions array
// Usage: pnpm tsx scripts/migrate-questions-to-array.ts

import { InterviewProjectExtra, InterviewProjectQuestion } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

// Split brief and questions using the marker
function splitBriefAndQuestions(text: string): { brief: string; questions: string } {
  const questionsSectionMarker = "\n\n## Interview Questions\n\n";
  const questionsSectionIndex = text.indexOf(questionsSectionMarker);

  if (questionsSectionIndex !== -1) {
    const briefPart = text.substring(0, questionsSectionIndex).trim();
    const questionsPart = text
      .substring(questionsSectionIndex + questionsSectionMarker.length)
      .trim();
    return { brief: briefPart, questions: questionsPart };
  }

  return { brief: text.trim(), questions: "" };
}

// Parse questions text into array of question objects
function parseQuestionsText(questionsText: string): Array<{ text: string }> {
  if (!questionsText.trim()) {
    return [];
  }

  return questionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line }));
}

async function main() {
  console.log("🚀 Starting migration: questions from brief to questions array...\n");

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find all interview projects
  const allProjects = await prisma.interviewProject.findMany({
    select: {
      id: true,
      brief: true,
      extra: true,
    },
  });

  console.log(`📊 Found ${allProjects.length} interview projects\n`);

  let migratedFromBriefCount = 0;
  let migratedFromOptimizedCount = 0;
  let cleanedOptimizedFieldsCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const project of allProjects) {
    try {
      // Get existing extra or create empty object
      const currentExtra =
        (project.extra as InterviewProjectExtra &
          Partial<{
            questions: InterviewProjectQuestion[];
            optimizedQuestions: string[];
            optimizationReason: string;
            lastOptimizedAt: number;
          }>) || {};

      let questionsArray: Array<{ text: string }> = [];
      let cleanBrief = project.brief;
      let migrationType = "";

      // First, try to extract questions from brief
      if (project.brief.includes("\n\n## Interview Questions\n\n")) {
        const { brief: extractedBrief, questions: questionsText } = splitBriefAndQuestions(
          project.brief,
        );
        const extractedQuestions = parseQuestionsText(questionsText);

        if (extractedQuestions.length > 0) {
          questionsArray = extractedQuestions;
          cleanBrief = extractedBrief;
          migrationType = "from-brief";
        }
      }

      // If no questions extracted from brief, check optimizedQuestions
      if (questionsArray.length === 0 && currentExtra.optimizedQuestions) {
        const optimizedQuestions = currentExtra.optimizedQuestions as string[];
        if (Array.isArray(optimizedQuestions) && optimizedQuestions.length > 0) {
          questionsArray = optimizedQuestions.map((text) => ({ text }));
          migrationType = "from-optimized";
        }
      }

      // Prepare updated extra - remove optimized fields and set questions
      const updatedExtra = { ...currentExtra };
      delete updatedExtra.optimizedQuestions;
      delete updatedExtra.optimizationReason;
      delete updatedExtra.lastOptimizedAt;

      if (questionsArray.length > 0) {
        updatedExtra.questions = questionsArray;
      }

      // Check if we need to update
      const hasOptimizedFields =
        currentExtra.optimizedQuestions ||
        currentExtra.optimizationReason ||
        currentExtra.lastOptimizedAt;
      const needsUpdate =
        questionsArray.length > 0 || hasOptimizedFields || cleanBrief !== project.brief;

      if (!needsUpdate) {
        console.log(`⏭️  Project ${project.id}: No changes needed, skipping`);
        skippedCount++;
        continue;
      }

      // Update project
      await prisma.interviewProject.update({
        where: { id: project.id },
        data: {
          brief: cleanBrief,
          extra: updatedExtra,
        },
      });

      // Log result
      if (migrationType === "from-brief") {
        console.log(
          `✅ Project ${project.id}: Migrated ${questionsArray.length} questions from brief to array`,
        );
        migratedFromBriefCount++;
      } else if (migrationType === "from-optimized") {
        console.log(
          `✅ Project ${project.id}: Copied ${questionsArray.length} questions from optimizedQuestions to questions`,
        );
        migratedFromOptimizedCount++;
      } else if (hasOptimizedFields) {
        console.log(`✅ Project ${project.id}: Cleaned optimized fields`);
        cleanedOptimizedFieldsCount++;
      }
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
  console.log(`✅ Migrated from brief: ${migratedFromBriefCount}`);
  console.log(`✅ Copied from optimizedQuestions: ${migratedFromOptimizedCount}`);
  console.log(`✅ Cleaned optimized fields only: ${cleanedOptimizedFieldsCount}`);
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
