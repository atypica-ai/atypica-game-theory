import { z } from "zod";

// Note: Persona generation now uses streamText directly, no schema needed

// Schema for interview analysis - now analyzes PDF content directly
export const analysisSchema = z.object({
  analysis: z.object({
    Demographic: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    Psychological: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    BehavioralEconomics: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    PoliticalCognition: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
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
export type AnalysisResult = z.infer<typeof analysisSchema>;

// Additional types for the new workflow
export interface PersonaAnalysisData {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  personaSummary?: string;
  analysis?: AnalysisResult["analysis"];
  supplementaryQuestions?: AnalysisResult["supplementaryQuestions"];
}

export interface DimensionScore {
  score: number;
  reason: string;
  questions?: string[];
}

export interface AnalysisCompletion {
  Demographic: DimensionScore;
  Psychological: DimensionScore;
  BehavioralEconomics: DimensionScore;
  PoliticalCognition: DimensionScore;
  total_score: number;
}
