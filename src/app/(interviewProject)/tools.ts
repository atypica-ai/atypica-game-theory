import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { InterviewProjectExtra } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";
import { RequestInteractionFormResult } from "./types";

export const interviewSessionTools = ({ interviewSessionId }: { interviewSessionId: number }) => ({
  endInterview: tool({
    description: "End the interview session and generate the interview summary and title",
    parameters: z.object({
      title: z
        .string()
        .describe(
          "A concise title for this interview session (maximum 20 words) that must start with the interviewee's name followed by a one-sentence summary to help identify and find this interview later.",
        ),
      interviewSummary: z
        .string()
        .describe(
          "A summary of the interview, including key points, insights, participant responses, notable observations, and overall interview quality. This summary will be passed to another agent for analysis and feedback.",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ title, interviewSummary }) => {
      await Promise.all([
        // 故意等10s，这样前端可以感觉到工具正在被执行。
        new Promise((resolve) => setTimeout(resolve, 10_000)),
        prisma.interviewSession.update({
          where: { id: interviewSessionId },
          data: { title: (title ?? "").slice(0, 200) },
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
    parameters: z.object({
      prologue: z
        .string()
        .describe(
          "Introductory text explaining why the user needs to fill out this form and what purpose it serves",
        ),
      fields: z
        .array(
          z.object({
            id: z.string().describe("Unique identifier for the field"),
            label: z.string().describe("Display label for the field"),
            type: z.enum(["text", "choice", "boolean"]).describe("Type of input field"),
            placeholder: z.string().optional().describe("Placeholder text for text fields"),
            options: z
              .array(z.string())
              .optional()
              .describe("Available options for choice fields (2-4 options)"),
          }),
        )
        .min(1)
        .describe("Array of form fields"),
    }),
    experimental_toToolResultContent: (result: RequestInteractionFormResult) => {
      // const responseString = Object.entries(result.formResponses)
      //   .map(([key, value]) => `${key}: ${value}`)
      //   .join("\n");
      return [{ type: "text", text: result.plainText }];
    },
  }),
});

export const questionOptimizationTools = ({ projectId }: { projectId: number }) => ({
  updateQuestions: tool({
    description: "Save the optimized interview questions and optimization reasoning to the project",
    parameters: z.object({
      optimizedQuestions: z.array(z.string()).describe("Array of optimized interview questions"),
      reason: z
        .string()
        .describe(
          "Explanation of why and how the questions were optimized, what changes were made and the reasoning behind them",
        ),
    }),
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
            } as InputJsonValue,
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
