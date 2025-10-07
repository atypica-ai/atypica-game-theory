import z from "zod/v3";

// endInterview tool schemas
export const interviewEndInterviewInputSchema = z.object({
  title: z
    .string()
    .describe(
      "A concise title for this interview session (maximum 20 words) that must start with the interviewee's name followed by a one-sentence summary to help identify and find this interview later.",
    ),
  interviewSummary: z
    .string()
    .describe(
      "A summary of the interview, including key points, insights, participant responses, notable observations, and overall interview quality. This summary will be passed to another agent for analysis and feedback.",
    ),
});

export const interviewEndInterviewOutputSchema = z.object({
  title: z.string(),
  interviewSummary: z.string(),
  plainText: z.string(),
});

// requestInteractionForm tool schemas
export const requestInteractionFormInputSchema = z.object({
  prologue: z
    .string()
    .describe(
      "Introductory text explaining why the user needs to fill out this form and what purpose it serves",
    ),
  fields: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the field"),
        label: z.string().describe("Display label for the field"),
        type: z.enum(["text", "choice", "boolean"]).describe("Type of input field"),
        placeholder: z.string().optional().describe("Placeholder text for text fields"),
        options: z
          .array(z.string())
          .optional()
          .describe("Available options for choice fields (2-4 options)"),
      }),
    )
    .min(1)
    .describe("Array of form fields"),
});

export type RequestInteractionFormToolInput = z.infer<typeof requestInteractionFormInputSchema>;

export const requestInteractionFormOutputSchema = z.object({
  formResponses: z.record(z.string()),
  plainText: z.string(),
});

// export interface RequestInteractionFormResult
//   extends z.infer<typeof requestInteractionFormOutputSchema> {}
export type RequestInteractionFormToolResult = z.infer<typeof requestInteractionFormOutputSchema>;

// updateQuestions tool schemas
export const updateQuestionsInputSchema = z.object({
  optimizedQuestions: z.array(z.string()).describe("Array of optimized interview questions"),
  reason: z
    .string()
    .describe(
      "Explanation of why and how the questions were optimized, what changes were made and the reasoning behind them",
    ),
});

export const updateQuestionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export enum InterviewToolName {
  endInterview = "endInterview",
  requestInteractionForm = "requestInteractionForm",
}

export type TInterviewUITools = {
  [InterviewToolName.endInterview]: {
    input: z.infer<typeof interviewEndInterviewInputSchema>;
    output: z.infer<typeof interviewEndInterviewOutputSchema>;
  };
  [InterviewToolName.requestInteractionForm]: {
    input: z.infer<typeof requestInteractionFormInputSchema>;
    output: z.infer<typeof requestInteractionFormOutputSchema>;
  };
};
