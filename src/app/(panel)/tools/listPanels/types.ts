import z from "zod/v3";

export const listPanelsInputSchema = z.object({
  searchQuery: z.string().trim().optional().describe("Optional keyword to filter panels by title"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum number of panels to return"),
});

const panelSummarySchema = z.object({
  panelId: z.number(),
  title: z.string(),
  instruction: z.string(),
  personaIds: z.array(z.number()),
  personaCount: z.number(),
  personas: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      tags: z.array(z.string()),
    }),
  ),
  usageCount: z.object({
    discussions: z.number(),
    interviews: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  link: z.string(),
});

export type ListPanelsToolInput = z.infer<typeof listPanelsInputSchema>;

export const listPanelsOutputSchema = z.object({
  panels: z.array(panelSummarySchema),
  plainText: z.string(),
});

export type ListPanelsToolOutput = z.infer<typeof listPanelsOutputSchema>;
