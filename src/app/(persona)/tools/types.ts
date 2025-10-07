import z from "zod/v3";

// endInterview tool schemas
export const followUpEndInterviewInputSchema = z.object({
  followUpSummary: z.string().describe("后续访谈的总结"),
});

export const followUpEndInterviewOutputSchema = z.object({
  followUpSummary: z.string(),
  plainText: z.string(),
});

export type TPersonaUITools = {
  endInterview: {
    input: z.infer<typeof followUpEndInterviewInputSchema>;
    output: z.infer<typeof followUpEndInterviewOutputSchema>;
  };
};
