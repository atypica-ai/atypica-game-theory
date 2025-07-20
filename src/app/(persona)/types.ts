import { z } from "zod";

// Schema for PDF processing
export const processSchema = z.object({
  interviewRecord: z.string().describe("The structured interview record in Markdown format"),
  processingNotes: z
    .string()
    .describe("Any notes about the processing, such as issues encountered or assumptions made"),
});

// Schema for interview analysis
export const analysisSchema = z.object({
  analysis: z.object({
    Demographic: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
    }),
    Psychological: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
    }),
    BehavioralEconomics: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
    }),
    PoliticalCognition: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
    }),
    total_score: z.number().min(0).max(12),
  }),
  supplementaryQuestions: z.object({
    questions: z
      .array(z.string())
      .describe("Array of supplementary questions to improve persona completeness"),
    reasoning: z
      .string()
      .describe(
        "Explanation of why these particular questions were chosen and how they address the gaps in the current interview",
      ),
  }),
});

// Inferred types
export type ProcessResult = z.infer<typeof processSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;
