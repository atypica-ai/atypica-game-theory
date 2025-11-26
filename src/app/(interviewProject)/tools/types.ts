import z from "zod/v3";

// Image attachment schema (reusable)
const imageAttachmentSchema = z.object({
  objectUrl: z.string(),
  name: z.string().max(255),
  mimeType: z.string(),
  size: z
    .number()
    .positive()
    .max(10 * 1024 * 1024), // 10MB max
});

// Option schema - supports both old format (object) and new format (string)
// Old format: { text: string, endInterview?: boolean }
// New format: string
// Always transforms to string array for output
const optionSchema = z.union([
  z.string().min(1, "Option text cannot be empty"),
  z.object({
    text: z.string().min(1, "Option text cannot be empty"),
    // endInterview: z.boolean().optional(),  // 改用 hint, 不再需要这个选项了
  }),
]);

// Question schema with strict validation
// Users create questions via UI. questionType is optional (defaults to "open" in frontend)
// but when specified as choice type, options are required
export const questionSchema = z
  .object({
    text: z.string().min(1, "Question text is required").max(1000, "Question text is too long"),
    image: imageAttachmentSchema.optional(),
    questionType: z.enum(["open", "single-choice", "multiple-choice"]).optional(),
    hint: z
      .string()
      .max(500, "Hint text is too long")
      .optional()
      .describe(
        "Natural language instructions for AI to handle special behaviors, e.g., 'If user selects 其他 option, show input field for details'",
      ),
    options: z
      .array(optionSchema)
      .min(2, "Choice questions must have at least 2 options")
      .max(50, "Choice questions can have at most 50 options")
      .optional(),
    // .transform((opts) => opts?.map((opt) => (typeof opt === "string" ? opt : opt.text))),
  })
  .superRefine((data, ctx) => {
    // If questionType is not specified, treat as "open" question (default behavior)
    const type = data.questionType ?? "open";

    // Choice questions MUST have options
    if (type === "single-choice" || type === "multiple-choice") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choice questions must have at least 2 options",
          path: ["options"],
        });
      }
    }

    // Open questions should NOT have options
    if (type === "open") {
      if (data.options && data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Open questions should not have options",
          path: ["options"],
        });
      }
    }
  });

export type QuestionData = z.infer<typeof questionSchema>;

// InterviewProjectExtra schema
export const interviewProjectQuestionsSchema = z.object({
  questions: z.array(questionSchema).optional(),
});

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
  personalInfo: z
    .array(
      z.object({
        label: z.string().describe("The field label, e.g., 'Name', 'Age', 'Occupation'"),
        text: z.string().describe("The collected information for this field"),
      }),
    )
    .optional()
    .describe(
      "Optional array of personal information collected during the interview. Each entry contains a label and the corresponding text value. Use this to capture any relevant demographic or contextual information about the interviewee that emerged during the conversation.",
    ),
});

export const interviewEndInterviewOutputSchema = z.object({
  // title: z.string(),
  // interviewSummary: z.string(),
  // personalInfo: z.array(z.object({ label: z.string(), text: z.string() })).optional(),
  plainText: z.string(),
});

// requestInteractionForm tool schemas
export const requestInteractionFormInputSchema = z.object({
  // prologue: z
  //   .string()
  //   .describe(
  //     "Introductory text explaining why the user needs to fill out this form and what purpose it serves",
  //   ),
  image: imageAttachmentSchema.optional().describe("Optional image to display with the form"),
  fields: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the field"),
        label: z.string().describe("Display label for the field"),
        type: z.enum(["text", "choice", "boolean"]).describe("Type of input field"),
        placeholder: z.string().optional().describe("Placeholder text for text fields"),
        options: z
          .array(optionSchema)
          .optional()
          .describe("Available options for choice fields (2-15 options)"),
        multipleChoice: z
          .boolean()
          .optional()
          .describe(
            "For choice fields: true if multiple options can be selected, false or undefined for single choice",
          ),
        minSelections: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("For multiple-choice fields: minimum number of options that must be selected"),
        maxSelections: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("For multiple-choice fields: maximum number of options that can be selected"),
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
  optimizedQuestions: z.array(z.string()).describe("Array of interview questions"),
});

export const updateQuestionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// selectQuestion tool schemas
export const selectQuestionInputSchema = z.object({
  questionIndex: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .pipe(z.number().int().positive())
    .describe(
      "The 1-based index of the question to select (e.g., 1 for the first question, 2 for the second)",
    ),
});

export const selectQuestionOutputSchema = z.object({
  question: z.object({
    text: z.string().describe("Question text"),
    type: z.enum(["open", "single-choice", "multiple-choice"]).describe("Question type"),
    hint: z.string().describe("Question hint").optional(),
  }),
  answer: z
    .union([z.string(), z.array(z.string())])
    .describe(
      "User's answer. For open questions: string. For choice questions (single/multiple): string array",
    ),
  plainText: z.string(), // Required for PlainTextToolResult compatibility - contains flow instructions for AI
});

export enum InterviewToolName {
  endInterview = "endInterview",
  requestInteractionForm = "requestInteractionForm",
  selectQuestion = "selectQuestion",
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
  [InterviewToolName.selectQuestion]: {
    input: z.infer<typeof selectQuestionInputSchema>;
    output: z.infer<typeof selectQuestionOutputSchema>;
  };
};

export type TAddInterviewUIToolResult = <TOOL extends keyof TInterviewUITools>({
  state,
  tool,
  toolCallId,
  output,
  errorText,
}:
  | {
      state?: "output-available";
      tool: TOOL;
      toolCallId: string;
      output: TInterviewUITools[TOOL]["output"];
      errorText?: never;
    }
  | {
      state: "output-error";
      tool: TOOL;
      toolCallId: string;
      output?: never;
      errorText: string;
    }) => Promise<void>;
