import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const planPodcastInputSchema = z.object({
  background: z
    .string()
    .describe(
      "Current context, findings so far, and relevant background information to help understand the situation",
    )
    .transform(fixMalformedUnicodeString),
  question: z
    .string()
    .describe("Specific question, problem, or topic that requires podcast content planning")
    .transform(fixMalformedUnicodeString),
});

export type PlanPodcastToolInput = z.infer<typeof planPodcastInputSchema>;

export const planPodcastOutputSchema = z.object({
  reasoning: z.string(),
  plainText: z.string(),
});

export type PlanPodcastResult = z.infer<typeof planPodcastOutputSchema>;
