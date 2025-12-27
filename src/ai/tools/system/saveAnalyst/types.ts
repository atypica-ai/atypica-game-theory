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
