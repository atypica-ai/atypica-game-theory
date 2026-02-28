import z from "zod/v3";

// endInterview tool schemas
export const endInterviewInputSchema = z.object({
  memory: z
    .string()
    .describe(
      "User's personal memory in Markdown format, including: professional background, company information, work context, goals, challenges, target audience, verification methods, and key insights from the interview. ",
    ),
});

export const endInterviewOutputSchema = z.object({
  plainText: z.string(),
});

export type TContextBuilderUITools = {
  endInterview: {
    input: z.infer<typeof endInterviewInputSchema>;
    output: z.infer<typeof endInterviewOutputSchema>;
  };
};
