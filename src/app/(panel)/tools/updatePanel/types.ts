import z from "zod/v3";

export const updatePanelInputSchema = z.object({
  panelId: z.number().optional().describe("Optional existing panel ID to update directly"),
  personaIds: z.array(z.number()).min(1).describe("The final persona IDs to set on the panel"),
  title: z.string().optional().describe("Panel title"),
});

export type UpdatePanelToolInput = z.infer<typeof updatePanelInputSchema>;

export const updatePanelOutputSchema = z.object({
  panelId: z.number(),
  personaIds: z.array(z.number()),
  title: z.string(),
  plainText: z.string(),
});

export type UpdatePanelToolOutput = z.infer<typeof updatePanelOutputSchema>;
