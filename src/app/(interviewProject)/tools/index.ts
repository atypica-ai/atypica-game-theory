import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import {
  interviewEndInterviewInputSchema,
  interviewEndInterviewOutputSchema,
  requestInteractionFormInputSchema,
  requestInteractionFormOutputSchema,
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
});

export const questionOptimizationTools = ({ projectId }: { projectId: number }) => ({
  updateQuestions: tool({
    description: "Save the interview questions to the project. IMPORTANT: Do not save more than 15 questions. The optimal range is 8-15 questions.",
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
