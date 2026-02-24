import { z } from "zod";

export const confirmPanelResearchPlanInputSchema = z.object({
  researchType: z
    .enum(["focusGroup", "userInterview", "expertInterview"])
    .describe("Type of research to conduct"),
  question: z.string().describe("The research question"),
  personaCount: z.number().describe("Number of personas participating"),
  executionPlan: z
    .string()
    .describe(
      "Conversation plan: what topics to explore, what questions to ask the personas, and the discussion flow. " +
        "Do NOT include time estimates, preparation steps, or report generation steps.",
    ),
});

export const confirmPanelResearchPlanOutputSchema = z.object({
  confirmed: z.literal(true).describe("User confirmation (always true when submitted)"),
  question: z.string().describe("The research question (may have been edited by user)"),
  executionPlan: z.string().describe("The execution plan (may have been edited by user)"),
  plainText: z.string().describe("Plain text summary of the confirmed plan"),
});

export type ConfirmPanelResearchPlanInput = z.infer<typeof confirmPanelResearchPlanInputSchema>;
export type ConfirmPanelResearchPlanOutput = z.infer<typeof confirmPanelResearchPlanOutputSchema>;
