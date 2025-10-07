import z from "zod/v3";

// endInterview tool schemas
export const endInterviewInputSchema = z.object({
  studyBrief: z
    .string()
    .describe(
      "A study brief written from the user's perspective, typically starting with '我...' (I...), describing their research needs, goals, and context. This brief will be passed to another agent for detailed research.",
    ),
});

export const endInterviewOutputSchema = z.object({
  studyBrief: z.string(),
  plainText: z.string(),
});

export type TNewStudyUITools = {
  endInterview: {
    input: z.infer<typeof endInterviewInputSchema>;
    output: z.infer<typeof endInterviewOutputSchema>;
  };
};
