import { z } from "zod";

// Note: Persona generation now uses streamText directly, no schema needed

// Schema for interview analysis - now analyzes PDF content directly
export const analysisSchema = z.object({
  analysis: z.object({
    demographic: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    psychological: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    behavioralEconomics: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    politicalCognition: z.object({
      score: z.number().min(0).max(3),
      reason: z.string(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Specific questions to improve this dimension"),
    }),
    totalScore: z.number().min(0).max(12),
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

// Type for PersonaImport analysis field (complete result from analyze-interview)
export type PersonaImportAnalysis = AnalysisResult;

// Schema for persona scoring
export const personaScoringSchema = z.object({
  demographic: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  psychological: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  behavioralEconomics: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  politicalCognition: z.number().min(0).max(1).describe("1 if present, 0 if not"),
});

export const followUpChatBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  }),
  userChatToken: z.string(),
});

export const personaChatBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  }),
  userChatToken: z.string(),
});
