import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// saveAnalyst tool schemas
export const saveAnalystInputSchema = z.object({
  role: z
    .string()
    .describe(
      "The expert analyst's professional role, specialization, or domain of expertise (maximum 100 chars)",
    ),
  topic: z
    .string()
    .describe(
      "Comprehensive research topic with all context. MUST include: 1) Complete background and problem description; 2) All industry information, trends, concepts from webSearch; 3) Study objectives and goals; 4) Target audience and groups; 5) Key questions and hypotheses; 6) Constraints and scope; 7) Expected outcomes. Format as comprehensive description providing complete context for subsequent activities.",
    )
    .transform(fixMalformedUnicodeString),
  kind: z
    .enum(["productRnD", "fastInsight", "testing", "insights", "creation", "planning", "misc"])
    .describe(
      "Research kind: 'productRnD' for product innovation opportunities discovery; 'fastInsight' for fast podcast-driven insights and content generation; 'testing' for A/B comparison, hypothesis validation, effectiveness measurement; 'insights' for understanding behaviors, discovering problems, analyzing current situations; 'creation' for generating ideas, designing innovative solutions; 'planning' for strategy development, framework design, structured implementation plans; 'misc' for general research that doesn't fit other categories",
    ),
  locale: z
    .enum(["zh-CN", "en-US", "misc"])
    .describe(
      "Content language: 'zh-CN' for Chinese, 'en-US' for English, 'misc' for unclear/mixed languages",
    ),
});

export type SaveAnalystToolInput = z.infer<typeof saveAnalystInputSchema>;

export const saveAnalystOutputSchema = z.object({
  analystId: z.number(),
  plainText: z.string(),
});

export type SaveAnalystToolResult = z.infer<typeof saveAnalystOutputSchema>;
