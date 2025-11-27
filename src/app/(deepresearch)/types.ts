import { z } from "zod/v3";
import { ExpertName } from "./experts/types";
export const deepResearchInputSchema = z.object({
  query: z.string().describe("The deep research query to investigate"),
  expert: z.nativeEnum(ExpertName).default(ExpertName.Auto).describe("The expert to use for the deep research. Default is 'auto'."),
});

export const deepResearchOutputSchema = z.object({
  result: z.string().describe("The deep research result"),
});

export type DeepResearchInput = z.infer<typeof deepResearchInputSchema>;
export type DeepResearchOutput = z.infer<typeof deepResearchOutputSchema>;
