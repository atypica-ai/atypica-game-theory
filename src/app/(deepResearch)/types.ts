import { z } from "zod";
import { ExpertName } from "./experts/types";

export const deepResearchInputSchema = z.object({
  query: z.string().describe("The deep research query to investigate"),
  expert: z
    // .enum([ExpertName.Auto, ExpertName.Grok, ExpertName.TrendExplorer])
    .enum(Object.values(ExpertName)) // only in zod v4
    // .nativeEnum(ExpertName) // only in zod v3
    .default(ExpertName.Auto)
    .describe("The expert to use for the deep research. Default is 'auto'."),
});

export const deepResearchOutputSchema = z.object({
  result: z.string().describe("The deep research result"),
  plainText: z.string(),
});

export type DeepResearchInput = z.infer<typeof deepResearchInputSchema>;
export type DeepResearchOutput = z.infer<typeof deepResearchOutputSchema>;
