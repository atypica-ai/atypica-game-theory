import { z } from "zod";

export const memoryUpdateInputSchema = z.object({
  operation: z
    .enum(["append", "replace", "delete"])
    .describe(
      "Operation type: 'append' to add at end, 'replace' to update a line, 'delete' to remove a line.",
    ),
  lineIndex: z
    .number()
    .int()
    .optional()
    .describe(
      "0-based line index. Required for 'replace' and 'delete' operations to specify target line. Not needed for 'append'.",
    ),
  newLine: z
    .string()
    .optional()
    .describe(
      "Markdown line content. Required for 'append' and 'replace' operations. Not needed for 'delete'.",
    ),
});

export type MemoryUpdateToolInput = z.infer<typeof memoryUpdateInputSchema>;

export const memoryUpdateOutputSchema = z.object({
  plainText: z.string(),
});

export type MemoryUpdateToolResult = z.infer<typeof memoryUpdateOutputSchema>;
