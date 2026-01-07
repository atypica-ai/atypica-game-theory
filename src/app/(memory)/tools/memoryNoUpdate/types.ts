import { z } from "zod";

export const memoryNoUpdateOutputSchema = z.object({
  plainText: z.string(),
});

export type MemoryNoUpdateToolResult = z.infer<typeof memoryNoUpdateOutputSchema>;
