import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export const discussionChatInputSchema = z.object({
  instruction: z
    .string()
    .describe(
      "Discussion instruction that includes 1. Core questions and discussion purpose; 2. fascilitating background information (about product, web info, data, etc.); 3. desired discussion type/style/format; (Optional) other supporting information.",
    ),
  personaIds: z
    .array(z.number())
    .min(2)
    .describe("List of persona IDs to participate in the panel discussion (minimum 2)"),
  timelineToken: z
    .string()
    .optional()
    .describe(
      "Discussion timeline token used to create records. You don't need to provide this - the system will automatically generate it",
    )
    // Always generate a new token, and this will directly override the parameter on toolInvocation.args in the message
    .transform(() => generateToken(32)),
});

export type DiscussionChatToolInput = z.infer<typeof discussionChatInputSchema>;

export const discussionChatOutputSchema = z.object({
  summary: z.string().describe("Detailed summary."),
  timelineToken: z.string().describe("Database record token for loading timeline data"),
  plainText: z.string().describe("Tool output text for LLM reading"),
});

export type DiscussionChatResult = z.infer<typeof discussionChatOutputSchema>;
