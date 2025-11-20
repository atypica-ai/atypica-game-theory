import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

/**
 * Migration script: Refactor selectQuestion tool input/output format
 *
 * This script migrates all existing interview session messages to use the new
 * selectQuestion tool format:
 *
 * Input changes:
 * - Keep only: questionIndex
 * - Remove: optionsMetadata
 *
 * Output changes:
 * - New format: { question: {text, type}, answer, plainText }
 * - Remove: questionIndex, questionText, questionType, options, image, formFields, optionsMetadata, userAnswer, shouldEndInterview
 *
 * Usage:
 * - Dry run (preview changes): npx tsx scripts/migrate-selectquestion-tool.ts
 * - Execute migration: npx tsx scripts/migrate-selectquestion-tool.ts --execute
 */

import { InterviewSessionExtra } from "@/prisma/client";

interface Question {
  text: string;
  questionType?: "open" | "single-choice" | "multiple-choice";
  options?: Array<string | { text: string; endInterview?: boolean }>;
  [key: string]: unknown;
}

interface OldToolOutput {
  questionIndex?: number;
  questionText?: string;
  questionType?: string;
  options?: string[];
  userAnswer?: string | string[];
  shouldEndInterview?: boolean;
  [key: string]: unknown;
}

interface NewToolOutput {
  question: {
    text: string;
    type: "open" | "single-choice" | "multiple-choice";
  };
  answer: string | string[];
  plainText: string;
}

function generatePlainText(
  questionIndex: number,
  questionText: string,
  answer: string | string[],
  shouldEndInterview: boolean,
): string {
  const answerText = Array.isArray(answer) ? answer.join(", ") : answer;
  let plainText = `[Question ${questionIndex + 1}] ${questionText}\n`;
  plainText += `[User's Answer] ${answerText}\n\n`;

  if (shouldEndInterview) {
    plainText += `🛑 STOP IMMEDIATELY!\n`;
    plainText += `The user selected an option that triggers interview termination.\n`;
    plainText += `You MUST call endInterview tool RIGHT NOW. Do NOT proceed to the next question.`;
  } else {
    plainText += `✅ Answer recorded successfully.\n`;
    plainText += `▶️ NEXT ACTION: Proceed to the next question immediately. Continue the interview flow.`;
  }

  return plainText;
}

function checkShouldEndInterview(question: Question, answer: string | string[]): boolean {
  if (!question.options) return false;

  const answerArray = Array.isArray(answer) ? answer : [answer];

  for (const option of question.options) {
    if (typeof option === "object" && option.endInterview) {
      if (answerArray.includes(option.text)) {
        return true;
      }
    }
  }

  return false;
}

async function migrateSelectQuestionTools(execute: boolean = false) {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma"); // 确保先 load env
  console.log("\n🔍 Starting selectQuestion tool migration...\n");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}\n`);

  // Get all session IDs first
  const sessionIds = await prisma.interviewSession.findMany({
    select: {
      id: true,
      userChatId: true,
    },
    where: {
      userChatId: { not: null },
    },
    orderBy: {
      id: "desc",
    },
  });

  console.log(`📊 Found ${sessionIds.length} interview sessions\n`);

  let totalMessages = 0;
  let migratedMessages = 0;
  let skippedMessages = 0;
  let processedSessions = 0;

  for (const { id: sessionId, userChatId } of sessionIds) {
    processedSessions++;
    console.log(`\n[${processedSessions}/${sessionIds.length}] Processing session ${sessionId}...`);

    // Fetch session data one by one
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        extra: true,
        userChatId: true,
      },
    });

    if (!session || !session.userChatId) {
      console.log(`  ⏭️  Skipped: No userChatId`);
      continue;
    }

    const sessionExtra = (session.extra as InterviewSessionExtra) || {};
    const questions = sessionExtra.questions || [];

    if (questions.length === 0) {
      console.log(`  ⏭️  Skipped: No questions`);
      continue;
    }

    // Get message IDs for this session
    const messageIds = await prisma.chatMessage.findMany({
      where: {
        userChatId: session.userChatId,
        role: "assistant",
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    console.log(`  📝 Found ${messageIds.length} assistant messages`);

    // Process messages one by one
    for (const { id: messageId } of messageIds) {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
      });

      if (!message) continue;

      const parts = (message.parts as any[]) || [];
      let modified = false;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // Check if this is a selectQuestion tool part
        if (part.type === "tool-selectQuestion") {
          totalMessages++;

          try {
            // Migrate input
            if (part.input) {
              const oldInput = part.input as any;
              const newInput: any = {
                questionIndex: oldInput.questionIndex,
              };
              part.input = newInput;
              modified = true;
            }

            // Migrate output (if exists)
            if (part.output && part.state === "output-available") {
              const oldOutput = part.output as OldToolOutput;

              // Check if already migrated (idempotency)
              if (oldOutput.question && oldOutput.answer !== undefined && oldOutput.plainText) {
                console.log(`  ✅ Message ${messageId}: Already migrated, skipped`);
                continue;
              }

              // Get questionIndex from input (唯一真相来源)
              const inputIndex = part.input?.questionIndex;
              if (!inputIndex || typeof inputIndex !== "number") {
                console.log(`  ⚠️  Message ${messageId}: questionIndex not found in input`);
                skippedMessages++;
                continue;
              }

              // Convert 1-based to 0-based for array access
              const questionIndex = inputIndex - 1;
              if (questionIndex < 0 || questionIndex >= questions.length) {
                console.log(
                  `  ⚠️  Message ${messageId}: questionIndex ${inputIndex} out of range [0, ${questions.length - 1}]`,
                );
                skippedMessages++;
                continue;
              }

              const question = questions[questionIndex] as Question;
              if (!question) {
                console.log(
                  `  ⚠️  Message ${messageId}: Question not found for index ${questionIndex}`,
                );
                skippedMessages++;
                continue;
              }

              // Get answer (唯一需要从旧output保留的数据)
              const userAnswer = oldOutput.userAnswer;
              const questionType = question.questionType || "open";
              let answer: string | string[];

              if (userAnswer === undefined || userAnswer === null) {
                console.log(`  ⚠️  Message ${messageId}: userAnswer is empty`);
                answer = questionType === "open" ? "" : [];
              } else if (questionType === "open") {
                // Open questions: answer should be string
                if (typeof userAnswer === "string") {
                  answer = userAnswer;
                } else if (Array.isArray(userAnswer)) {
                  // Shouldn't happen, but join if it does
                  console.log(`  ⚠️  Message ${messageId}: open question has array answer`);
                  answer = userAnswer.join(", ");
                } else {
                  answer = String(userAnswer);
                }
              } else {
                // Choice questions (single/multiple): answer should be string[]
                if (Array.isArray(userAnswer)) {
                  answer = userAnswer;
                } else if (typeof userAnswer === "string") {
                  // Convert single string to array for choice questions
                  answer = [userAnswer];
                } else {
                  console.log(
                    `  ⚠️  Message ${messageId}: unexpected userAnswer type: ${typeof userAnswer}`,
                  );
                  answer = [String(userAnswer)];
                }
              }

              // Check if should end interview
              const shouldEndInterview =
                oldOutput.shouldEndInterview || checkShouldEndInterview(question, userAnswer || "");

              // Create new output
              const newOutput: NewToolOutput = {
                question: {
                  text: question.text,
                  type: question.questionType || "open",
                },
                answer,
                plainText: generatePlainText(
                  questionIndex,
                  question.text,
                  answer,
                  shouldEndInterview,
                ),
              };

              part.output = newOutput;
              modified = true;
              migratedMessages++;
              console.log(`  ✅ Message ${messageId}: Successfully migrated`);
            }
          } catch (error) {
            console.error(`  ❌ Message ${messageId}: Migration error:`, error);
            skippedMessages++;
          }
        }
      }

      // Update message if modified
      if (modified && execute) {
        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { parts: parts as any },
        });
        console.log(`  💾 Message ${messageId}: Saved to database`);
      }
    }
  }

  console.log("\n📈 Migration Summary:");
  console.log(`   Total selectQuestion tool calls found: ${totalMessages}`);
  console.log(`   Successfully migrated: ${migratedMessages}`);
  console.log(`   Skipped (errors): ${skippedMessages}`);

  if (!execute) {
    console.log("\n💡 This was a DRY RUN. No data was modified.");
    console.log("   Run with --execute flag to apply changes.\n");
  } else {
    console.log("\n✅ Migration completed successfully!\n");
  }
}

// Main execution
const execute = process.argv.includes("--execute");

migrateSelectQuestionTools(execute)
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(process.exit);
