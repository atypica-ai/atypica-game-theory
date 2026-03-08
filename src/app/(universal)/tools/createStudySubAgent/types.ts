import z from "zod/v3";

export const createStudySubAgentInputSchema = z.object({
  taskRequirement: z
    .string()
    .min(1)
    .describe("Specific study task for the sub-agent to execute."),
  outputFormat: z
    .string()
    .min(1)
    .describe("Expected output format for the sub-agent result."),
  subAgentTitle: z
    .string()
    .optional()
    .describe("Optional title override for the created sub-agent chat."),
});

export const createStudySubAgentOutputSchema = z.object({
  status: z.enum(["running", "completed", "failed"]),
  resultSummary: z.string(),
  plainText: z.string(),
  subAgentChatId: z.number(),
  subAgentChatToken: z.string(),
});

export type CreateStudySubAgentToolInput = z.infer<typeof createStudySubAgentInputSchema>;
export type CreateStudySubAgentToolResult = z.infer<typeof createStudySubAgentOutputSchema>;
