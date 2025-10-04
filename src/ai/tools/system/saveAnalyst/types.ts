import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// saveAnalyst tool schemas
export const saveAnalystInputSchema = (productRnD?: boolean) =>
  z.object({
    role: z
      .string()
      .describe(
        "The expert analyst's professional role, specialization, or domain of expertise (maximum 5 words)",
      ),
    topic: z
      .string()
      .describe(
        "Comprehensive and detailed study topic description that MUST include: 1) Complete background context and problem description provided by the study initiator; 2) All relevant industry information, market trends, concepts, and data obtained through webSearch (even if not directly mentioned in conversations, integrate all webSearch findings into the topic); 3) Specific study objectives and goals; 4) Target audience and user groups; 5) Key study questions and hypotheses to be tested; 6) Any constraints, requirements, or scope limitations; 7) Expected outcomes and deliverables. Format as a well-structured, comprehensive description that provides complete context for all subsequent study activities. This topic will serve as the foundation for the entire study, so include ALL available information and context.",
      )
      .transform(fixMalformedUnicodeString),
    kind: productRnD
      ? z
          .enum(["productRnD"])
          .describe("This value is fixed to 'productRnD'")
          .transform(() => "productRnD")
      : z
          .enum(["testing", "planning", "insights", "creation", "misc"])
          .describe(
            "Study type: 'testing' for comparing options, validating hypotheses, measuring effectiveness, and testing user reactions or preferences; 'insights' for understanding current situations, discovering problems, and analyzing behaviors; 'creation' for generating new ideas, designing innovative solutions, and creative exploration; 'planning' for developing frameworks, designing solution architectures, and creating structured implementation plans; 'misc' for general study that doesn't fit the other categories",
          ),
    locale: z
      .enum(["zh-CN", "en-US", "misc"])
      .describe(
        "Language used in the text parameters (role, topic, etc.). Use 'zh-CN' for Chinese content, 'en-US' for English content, 'misc' for unclear or mixed languages that cannot be clearly determined.",
      ),
  });

export type SaveAnalystToolInput = z.infer<ReturnType<typeof saveAnalystInputSchema>>;

export const saveAnalystOutputSchema = z.object({
  analystId: z.number(),
  plainText: z.string(),
});

export type SaveAnalystToolResult = z.infer<typeof saveAnalystOutputSchema>;

// saveAnalystStudySummary tool schemas
export const saveAnalystStudySummaryInputSchema = z.object({
  studySummary: z
    .string()
    .describe(
      "Objective documentation of study design, methodology steps, data collection process, and workflow execution (exclude conclusions or findings). Valuable findings from websearch results according to study plan should be summarized and included.",
    )
    .transform(fixMalformedUnicodeString),
});

export const saveAnalystStudySummaryOutputSchema = z.object({
  plainText: z.string(),
});

export type SaveAnalystStudySummaryToolResult = z.infer<typeof saveAnalystStudySummaryOutputSchema>;

// saveInnovationSummary tool schemas
export const saveInnovationSummaryInputSchema = z.object({
  studySummary: z
    .string()
    .describe(
      "Comprehensively and thoroughly save the complete innovation research process, providing as detailed and comprehensive information as possible: original product key information, innovative product solutions, innovation sources and processes, consumer demand insights, target customer profiles, demand gap analysis, competitive analysis of original products, innovation solution uniqueness validation, and user feedback citations",
    )
    .transform(fixMalformedUnicodeString),
  searchLog: z
    .string()
    .describe(
      "I'd like to include a dedicated section in the report that explains the entire innovation process logic. This will help readers better connect with the solution and be convinced by it. The section should include four parts: ## Innovation Process Logic ### 1. Starting Point Describe in one sentence what product the user wants to innovate and what type of innovation it is. ### 2. Search Strategy Describe in one sentence what inspiration search strategy the final solution is based on. ### 3. Inspiration Describe in one sentence what the final inspiration point or reference product is, and why this inspiration point was chosen. ### 4. Innovation Present the formula: 'Original Product + Inspiration Point = Final Innovation Product' This structure will provide readers with a clear understanding of how we arrived at the innovative solution, making the proposal more compelling and easier to follow. In MD format, no emojis.",
    )
    .transform(fixMalformedUnicodeString),
});

export const saveInnovationSummaryOutputSchema = z.object({
  plainText: z.string(),
});

export type SaveInnovationSummaryToolResult = z.infer<typeof saveInnovationSummaryOutputSchema>;
