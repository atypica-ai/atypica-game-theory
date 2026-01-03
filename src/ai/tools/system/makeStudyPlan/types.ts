import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// makeStudyPlan tool schemas
export const makeStudyPlanInputSchema = z.object({
  locale: z
    .enum(["zh-CN", "en-US", "misc"])
    .describe("Content language: 'zh-CN' for Chinese, 'en-US' for English, 'misc' for unclear/mixed languages"),

  kind: z
    .enum(["productRnD", "fastInsight", "testing", "insights", "creation", "planning", "misc"])
    .describe(
      "Research kind (auto-determined): 'productRnD' for product innovation opportunities discovery; 'fastInsight' for fast podcast-driven insights and content generation; 'testing' for A/B comparison, hypothesis validation, effectiveness measurement; 'insights' for understanding behaviors, discovering problems, analyzing current situations; 'creation' for generating ideas, designing innovative solutions; 'planning' for strategy development, framework design, structured implementation plans; 'misc' for general research that doesn't fit other categories",
    ),

  role: z
    .string()
    .max(100)
    .describe(
      "The expert analyst's professional role, specialization, or domain of expertise (maximum 100 chars)",
    ),

  topic: z
    .string()
    .describe(
      "Comprehensive research topic with all context. MUST include: 1) Complete background and problem description; 2) All industry information, trends, concepts from webSearch; 3) Study objectives and goals; 4) Target audience and groups; 5) Key questions and hypotheses; 6) Constraints and scope; 7) Expected outcomes. Format as comprehensive description providing complete context for subsequent activities.",
    )
    .transform(fixMalformedUnicodeString),

  planContent: z.string().describe(`
    Complete research plan in markdown format. MUST include these sections:

    ## 📋 Research Intent
    **Research Object**: [Detailed description of target user groups]
    **Research Scenario**: [Specific usage scenario or decision moment]
    **Focus Dimensions**: [List all aspects of focus, e.g., brand preference, price sensitivity, emotional factors, etc.]

    ## 🔬 Research Method
    **Analysis Framework**: [e.g., JTBD, KANO, User Journey Map, Emotion Map, etc.]
    **Research Approach**: [e.g., Social media observation (scoutTask) + one-on-one interviews (interview)]
    **Persona Configuration**:
    - Count: X AI personas
    - Quality Tier: [standard/premium/professional]

    ## 📊 Expected Output
    - [Output 1: e.g., User segmentation]
    - [Output 2: e.g., Purchase decision map]
    - [Output 3: e.g., Strategy recommendations]

    ---

    Ready to execute?
  `),
});

export type MakeStudyPlanToolInput = z.infer<typeof makeStudyPlanInputSchema>;

export const makeStudyPlanOutputSchema = z.object({
  confirmed: z.boolean().describe("Whether user confirmed to start execution"),
  plainText: z.string().describe("Plain text confirmation message"),
});

export type MakeStudyPlanToolResult = z.infer<typeof makeStudyPlanOutputSchema>;
