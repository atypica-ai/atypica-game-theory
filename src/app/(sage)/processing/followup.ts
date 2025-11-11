import { llm } from "@/ai/provider";
import { interviewPlanSystem } from "@/app/(sage)/prompt/chat";
import { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import z from "zod";

/**
 * Generate interview plan for supplementary interview
 */
export async function generateInterviewPlan({
  sage,
  knowledgeGaps,
  locale,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  knowledgeGaps: Array<{
    area: string;
    severity: SageKnowledgeGapSeverity;
    description: string;
    impact: string;
    suggestedQuestions: string[];
  }>;
  locale: Locale;
}): Promise<{
  purpose: string;
  focusAreas: string[];
  questions: Array<{ question: string; purpose: string; followUps: string[] }>;
}> {
  const interviewPlanSchema = z.object({
    purpose: z.string().describe("Purpose of this supplementary interview"),
    focusAreas: z.array(z.string()).describe("Key focus areas for the interview"),
    questions: z.array(
      z.object({
        question: z.string().describe("Interview question"),
        purpose: z.string().describe("Purpose of asking this question"),
        followUps: z.array(z.string()).describe("Potential follow-up questions (2-3 questions)"),
      }),
    ),
  });

  const result = await generateObject({
    model: llm("claude-sonnet-4"),
    schema: interviewPlanSchema,
    system: interviewPlanSystem({ sage, knowledgeGaps, locale }),
    prompt:
      locale === "zh-CN"
        ? "请生成补充访谈计划。"
        : "Please generate the supplementary interview plan.",
    maxRetries: 3,
  });

  return result.object;
}
