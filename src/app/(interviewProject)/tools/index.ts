import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { InterviewProjectExtra, InterviewSessionExtra } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
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
    execute: async ({ title, interviewSummary }) => {
      // Get current session to preserve existing extra data
      const currentSession = await prisma.interviewSession
        .findUniqueOrThrow({ where: { id: interviewSessionId } })
        .then(({ extra, ...session }) => ({ extra: extra as InterviewSessionExtra, ...session }));
      await Promise.all([
        // 故意等10s，这样前端可以感觉到工具正在被执行。
        new Promise((resolve) => setTimeout(resolve, 10_000)),
        prisma.interviewSession.update({
          where: { id: interviewSessionId },
          data: {
            title: (title ?? "").slice(0, 200),
            extra: {
              ...currentSession.extra,
              ongoing: undefined,
            } as InputJsonValue,
          },
        }),
      ]);
      return {
        title,
        interviewSummary,
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
    description: "Save the optimized interview questions and optimization reasoning to the project",
    inputSchema: updateQuestionsInputSchema,
    outputSchema: updateQuestionsOutputSchema,
    execute: async ({ optimizedQuestions, reason }) => {
      try {
        // Get current project data
        const project = await prisma.interviewProject.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          throw new Error(`InterviewProject ${projectId} not found`);
        }

        const currentExtra = (project.extra as InterviewProjectExtra) || {};

        // Update project with optimized questions and reason
        await prisma.interviewProject.update({
          where: { id: projectId },
          data: {
            extra: {
              ...currentExtra,
              optimizedQuestions,
              optimizationReason: reason,
              lastOptimizedAt: Date.now(),
            } as InterviewProjectExtra,
          },
        });

        return {
          success: true,
          message: `Successfully saved ${optimizedQuestions.length} optimized questions with reasoning`,
        };
      } catch (error) {
        throw error;
      }
    },
  }),
});
