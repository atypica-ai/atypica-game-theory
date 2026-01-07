import { z } from "zod";

export const memoryUpdateInputSchema = z.object({
  lineIndex: z
    .number()
    .int()
    .describe("0-based line index to insert after. Use -1 to append at end."),
  newLine: z.string().describe("Markdown line to insert. Should be concise and structured."),
});

export type MemoryUpdateToolInput = z.infer<typeof memoryUpdateInputSchema>;

export const memoryUpdateOutputSchema = z.object({
  plainText: z.string(),
});

export type MemoryUpdateToolResult = z.infer<typeof memoryUpdateOutputSchema>;
