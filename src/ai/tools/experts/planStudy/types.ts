import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const planStudyInputSchema = z.object({
  background: z
    .string()
    .describe(
      "Current context, findings so far, and relevant background information to help the expert understand the situation",
    )
    .transform(fixMalformedUnicodeString),
  question: z
    .string()
    .describe("Specific question, problem, or topic that requires expert analysis and reasoning")
    .transform(fixMalformedUnicodeString),
});

export const planStudyOutputSchema = z.object({
  reasoning: z.string(),
  text: z.string(),
  plainText: z.string(),
});

export type PlanStudyResult = z.infer<typeof planStudyOutputSchema>;
