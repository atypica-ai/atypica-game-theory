import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { InterviewSessionExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import {
  interviewEndInterviewInputSchema,
  interviewEndInterviewOutputSchema,
  requestInteractionFormInputSchema,
  requestInteractionFormOutputSchema,
  selectQuestionInputSchema,
  selectQuestionOutputSchema,
  updateQuestionsInputSchema,
  updateQuestionsOutputSchema,
} from "./types";

export const interviewSessionTools = ({ interviewSessionId }: { interviewSessionId: number }) => ({
  endInterview: tool({
    description: "End the interview session and generate the interview summary and title",
    inputSchema: interviewEndInterviewInputSchema,
    outputSchema: interviewEndInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ title, interviewSummary, personalInfo }) => {
      // Check question completion status
      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewSessionId },
        select: { extra: true },
      });

      const sessionExtra = (session?.extra as InterviewSessionExtra) || {};
      const questions = sessionExtra.questions || [];
      const selectedIndexes = sessionExtra.selectedQuestionIndexes || [];

      // Log warning if not all questions were asked
      if (questions.length > 0 && selectedIndexes.length < questions.length) {
        const unaskedQuestions = questions
          .map((q, i) => ({ index: i + 1, text: q.text }))
          .filter((q) => !selectedIndexes.includes(q.index));

        rootLogger.warn({
          msg: "Interview ended with unasked questions",
          interviewSessionId,
          totalQuestions: questions.length,
          askedQuestions: selectedIndexes.length,
          unaskedQuestions: unaskedQuestions.map((q) => `${q.index}. ${q.text}`),
        });
      }

      const trimmedTitle = (title ?? "").slice(0, 200);
      const extraUpdate = personalInfo && personalInfo.length > 0 ? { personalInfo } : {};

      await Promise.all([
        // 故意等10s，这样前端可以感觉到工具正在被执行。
        new Promise((resolve) => setTimeout(resolve, 10_000)),
        // Use raw SQL to update title and extra fields atomically
        // Remove 'ongoing' field and optionally add 'personalInfo'
        prisma.$executeRaw`
          UPDATE "InterviewSession"
          SET "title" = ${trimmedTitle},
              "extra" = (COALESCE("extra", '{}') - 'ongoing') || ${JSON.stringify(extraUpdate)}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${interviewSessionId}
        `,
      ]);
      return {
        // title,
        // interviewSummary,
        // personalInfo,
        plainText: "",
      };
    },
  }),
  requestInteractionForm: tool({
    description:
      "Generate a dynamic form with various input types (text, choice, boolean) for collecting user input during research workflows",
    inputSchema: requestInteractionFormInputSchema,
    outputSchema: requestInteractionFormOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
  }),
  selectQuestion: tool({
    description:
      "Select a question from the pre-defined question list by its index (1-based). Each question can only be selected once. Returns the question details and a pre-generated form for the user to answer.",
    inputSchema: selectQuestionInputSchema,
    outputSchema: selectQuestionOutputSchema,
    execute: async ({ questionIndex }) => {
      // Fetch session data
      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewSessionId },
        select: { extra: true },
      });

      if (!session) {
        throw new Error(`InterviewSession ${interviewSessionId} not found`);
      }

      const sessionExtra = (session.extra as InterviewSessionExtra) || {};
      const questions = sessionExtra.questions || [];
      const selectedIndexes = sessionExtra.selectedQuestionIndexes || [];

      // Validate index (convert from 1-based to 0-based)
      const arrayIndex = questionIndex - 1;
      if (arrayIndex < 0 || arrayIndex >= questions.length) {
        throw new Error(
          `Invalid question index ${questionIndex}. Valid range is 1 to ${questions.length}.`,
        );
      }

      // Check if already selected
      if (selectedIndexes.includes(questionIndex)) {
        throw new Error(
          `Question ${questionIndex} has already been asked. Please select a different question.`,
        );
      }

      // Get the question
      const question = questions[arrayIndex];

      // Update selectedQuestionIndexes
      const updatedIndexes = [...selectedIndexes, questionIndex];
      await prisma.$executeRaw`
        UPDATE "InterviewSession"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ selectedQuestionIndexes: updatedIndexes })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${interviewSessionId}
      `;

      // Return question details
      return {
        questionIndex,
        questionText: question.text,
        questionType: question.questionType || "open",
        options: question.options,
        image: question.image,
        formFields: question.formFields,
      };
    },
  }),
});

export const questionOptimizationTools = ({ projectId }: { projectId: number }) => ({
  updateQuestions: tool({
    description:
      "Save the interview questions to the project. IMPORTANT: Do not save more than 15 questions. The optimal range is 8-15 questions.",
    inputSchema: updateQuestionsInputSchema,
    outputSchema: updateQuestionsOutputSchema,
    execute: async ({ optimizedQuestions }) => {
      try {
        // Verify project exists
        const project = await prisma.interviewProject.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          throw new Error(`InterviewProject ${projectId} not found`);
        }

        // Convert string array to questions array format
        const questions = optimizedQuestions.map((text) => ({ text }));

        // Use raw SQL to update extra field with JSON operators
        // This safely merges new fields into existing extra without race conditions
        await prisma.$executeRaw`
          UPDATE "InterviewProject"
          SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
            questions,
          })}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${projectId}
        `;

        return {
          success: true,
          message: `Successfully saved ${questions.length} questions`,
        };
      } catch (error) {
        throw error;
      }
    },
  }),
});
