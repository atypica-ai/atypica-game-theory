import z from "zod/v3";

export const createPanelInputSchema = z.object({
  personaIds: z.array(z.number()).min(1).describe("Persona IDs that should be included in the new panel"),
  title: z.string().trim().optional().describe("Optional panel title"),
  instruction: z.string().trim().optional().describe("Optional description or creation intent for this panel"),
});

export type CreatePanelToolInput = z.infer<typeof createPanelInputSchema>;

export const createPanelOutputSchema = z.object({
  panelId: z.number(),
  title: z.string(),
  personaIds: z.array(z.number()),
  link: z.string(),
  plainText: z.string(),
});

export type CreatePanelToolOutput = z.infer<typeof createPanelOutputSchema>;
