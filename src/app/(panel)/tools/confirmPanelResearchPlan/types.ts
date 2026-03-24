import { z } from "zod";

export const confirmPanelResearchPlanInputSchema = z.object({
  researchType: z
    .enum(["focusGroup", "userInterview", "expertInterview"])
    .describe("Type of research to conduct"),
  question: z
    .string()
    .describe(
      "The research question shown for confirmation; the user may edit it. Whatever is submitted becomes the canonical question for downstream tools.",
    ),
  personaCount: z.number().describe("Number of personas participating"),
  executionPlan: z
    .string()
    .describe(
      "Conversation plan: topics, questions for personas, and discussion flow. No time estimates, prep steps, or report steps. " +
        "The user may edit this text; the submitted version is the canonical brief for discussionChat / interviewChat instructions.",
    ),
});

export const confirmPanelResearchPlanOutputSchema = z.object({
  confirmed: z.literal(true).describe("User confirmation (always true when submitted)"),
  question: z
    .string()
    .describe("Final confirmed research question—authoritative for all later execution; overrides any earlier draft."),
  executionPlan: z
    .string()
    .describe("Final confirmed execution plan—authoritative brief for instruction fields; overrides any earlier draft."),
  plainText: z.string().describe("Plain text summary of the confirmed plan"),
});

export type ConfirmPanelResearchPlanInput = z.infer<typeof confirmPanelResearchPlanInputSchema>;
export type ConfirmPanelResearchPlanOutput = z.infer<typeof confirmPanelResearchPlanOutputSchema>;
