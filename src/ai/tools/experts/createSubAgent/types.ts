import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export const createSubAgentInputSchema = z.object({
  subAgentChatToken: z
    .string()
    .optional()
    .describe(
      "Unique identifier for the sub-agent task. You don't need to provide this - the system will automatically generate it.",
    )
    .transform(() => generateToken()),
  taskRequirement: z
    .string()
    .describe(
      "The task requirement that the sub-agent needs to complete. This task should be specific and detailed, forbid multi-task combination",
    ),
  outputFormat: z
    .string()
    .describe(
      "This describes how the result should be structured and what content should be covered in the output. The output dimensions should be coherent with taskRequirement, and limited to 3 dimensions atmost, the performance is better when the output is more focused and dimensions the fewer.",
    ),
});

export type CreateSubAgentToolInput = z.infer<typeof createSubAgentInputSchema>;

export const createSubAgentOutputSchema = z.object({
  result: z.string().describe("Final result from the sub-agent LLM output"),
  plainText: z.string().describe("Plain text version of the result (same as result)"),
  subAgentChatId: z.number().describe("The ID of the sub-agent chat"),
  subAgentChatToken: z.string().describe("The token of the sub-agent chat"),
});

export type CreateSubAgentResult = z.infer<typeof createSubAgentOutputSchema>;
