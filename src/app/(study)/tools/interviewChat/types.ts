import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const interviewChatInputSchema = z.object({
  panelId: z
    .number()
    .optional()
    .describe(
      "If provided, use this existing panel. Persona IDs will be filtered to only those belonging to the panel.",
    ),
  personas: z
    .array(
      z.object({
        id: z.number().describe("The personaId value from previously built or found personas"),
        name: z.string().describe("Display name of the persona corresponding to the personaId"),
      }),
    )
    // .max(5) // 去掉，防止 zod 在 validate 的时候报错，有时候模型会不遵守，但其实问题不大
    .describe(
      "List of study participants (maximum 5). Must use personas that have been built or found in the current study - do not create fictional ones",
    ),
  instruction: z
    .string()
    .describe(
      "Interview focus and specific questions or topics to explore based on the study objectives",
    )
    .transform(fixMalformedUnicodeString),
  attachmentIds: z
    .array(z.number())
    .optional()
    .describe(
      "IDs of user-uploaded attachments to share with interview personas (e.g. [1, 2] for [#1] and [#2])",
    ),
});

export type InterviewChatToolInput = z.infer<typeof interviewChatInputSchema>;

export const interviewChatOutputSchema = z.object({
  panelId: z.number(),
  issues: z.array(
    z.object({
      name: z.string(),
      issue: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type InterviewChatResult = z.infer<typeof interviewChatOutputSchema>;
