import z from "zod/v3";

export type TPersonaForStudy = {
  personaId: number;
  name: string;
  tags: string[];
  source: string;
};

export const buildPersonaInputSchema = z.object({
  scoutUserChatToken: z
    .string()
    .describe(
      "Token from the completed user profile search task (scoutTaskChat). Must use the actual token from current research session - do not fabricate or reuse old tokens",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Optional persona requirements from research plan (planStudy). If provided, should guide persona construction: target characteristics, demographics, key dimensions, quantity expectations, etc. This ensures built personas align with research objectives.",
    ),
});

export type BuildPersonaToolInput = z.infer<typeof buildPersonaInputSchema>;

export const buildPersonaOutputSchema = z.object({
  personas: z.array(
    z.object({
      personaId: z.number(),
      name: z.string(),
      tags: z.array(z.string()),
      source: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type BuildPersonaToolResult = z.infer<typeof buildPersonaOutputSchema>;
