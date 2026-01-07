import { z } from "zod";

export const memoryReorganizeInputSchema = z.object({
  currentContent: z.string().describe("Current memory content to reorganize"),
});

export type MemoryReorganizeToolInput = z.infer<typeof memoryReorganizeInputSchema>;

export const memoryReorganizeOutputSchema = z.object({
  reorganizedContent: z.string().describe("Reorganized and summarized memory content"),
});

export type MemoryReorganizeToolResult = z.infer<typeof memoryReorganizeOutputSchema>;
