import z from "zod/v3";

export const requestSelectPersonasInputSchema = z.object({});

export type RequestSelectPersonasToolInput = z.infer<typeof requestSelectPersonasInputSchema>;

export const requestSelectPersonasOutputSchema = z.object({
  personaIds: z.array(z.number()),
  plainText: z.string(),
});

export type RequestSelectPersonasToolOutput = z.infer<typeof requestSelectPersonasOutputSchema>;
