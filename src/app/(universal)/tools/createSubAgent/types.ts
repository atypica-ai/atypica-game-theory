import z from "zod/v3";

export const createSubAgentInputSchema = z.object({
  taskRequirement: z
    .string()
    .min(1)
    .describe("Specific study task for the sub-agent to execute."),
  outputFormat: z
    .string()
    .min(1)
    .describe("Expected output format for the sub-agent result."),
  mode: z
    .enum(["study", "flexible", "panel"])
    .default("study")
    .describe(
      "Execution mode: study = full workflow (search personas → interview/discuss → report), flexible = all tools available without forced flow, panel = personas pre-selected (skip search/build → discuss/interview → report).",
    ),
  subAgentTitle: z
    .string()
    .optional()
    .describe("Optional title override for the created sub-agent chat."),
});

export const createSubAgentOutputSchema = z.object({
  status: z.enum(["running", "completed", "failed"]),
  resultSummary: z.string(),
  plainText: z.string(),
  subAgentChatId: z.number(),
  subAgentChatToken: z.string(),
});

export type CreateSubAgentToolInput = z.infer<typeof createSubAgentInputSchema>;
export type CreateSubAgentToolResult = z.infer<typeof createSubAgentOutputSchema>;
