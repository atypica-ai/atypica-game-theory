import { z } from "zod";

export enum PersonaTier {
  Tier0 = 0, // 是普通的 ai persona
  Tier1 = 1, // **合成智能体** 是质量比较好的 ai persona
  Tier2 = 2, // **真人模拟智能体** 是抽象的真的人群，是 atypica 团队构建出来的更高级的 persona
  Tier3 = 3, // **私有智能体** 是用户通过 personaimport 功能导入的，这种 persona 是用户私有的，不能被别人搜索到
}

// Note: Persona generation now uses streamText directly, no schema needed

const analysisDimension = () =>
  z.object({
    score: z.number().min(0).max(3),
    reason: z.string(),
    questions: z
      .array(z.string())
      .optional()
      .describe("Specific questions to improve this dimension"),
  });

// Schema for interview analysis - now analyzes PDF content directly
export const analysisSchema = z.object({
  analysis: z.object({
    demographic: analysisDimension(),
    geographic: analysisDimension(),
    psychological: analysisDimension(),
    behavioral: analysisDimension(),
    needsPainPoints: analysisDimension(),
    techAcceptance: analysisDimension(),
    socialRelations: analysisDimension(),
    totalScore: z.number().min(0).max(21), // 7 dimensions × 3 points each
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
  geographic: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  psychological: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  behavioral: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  needsPainPoints: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  techAcceptance: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  socialRelations: z.number().min(0).max(1).describe("1 if present, 0 if not"),
});
