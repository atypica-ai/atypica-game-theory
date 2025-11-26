import { z } from "zod/v3";

export const deepResearchInputSchema = z.object({
  query: z.string().describe("The deep research query to investigate"),
});

export const deepResearchOutputSchema = z.object({
  result: z.string().describe("The deep research result"),
});

export type DeepResearchInput = z.infer<typeof deepResearchInputSchema>;
export type DeepResearchOutput = z.infer<typeof deepResearchOutputSchema>;
