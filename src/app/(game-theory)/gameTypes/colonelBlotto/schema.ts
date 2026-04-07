import z from "zod/v3";

// Simplified Colonel Blotto: Allocate 10 troops across 4 battlefields.
// Each allocation must be 0, 1, 2, or 3 troops (discrete, not continuous).
export const colonelBlottoActionSchema = z.object({
  battlefield1: z.number().int().min(0).max(3).describe("Troops on battlefield 1 (0-3)"),
  battlefield2: z.number().int().min(0).max(3).describe("Troops on battlefield 2 (0-3)"),
  battlefield3: z.number().int().min(0).max(3).describe("Troops on battlefield 3 (0-3)"),
  battlefield4: z.number().int().min(0).max(3).describe("Troops on battlefield 4 (0-3)"),
}).refine(
  (data) => data.battlefield1 + data.battlefield2 + data.battlefield3 + data.battlefield4 === 6,
  {
    message: "Total troops must equal exactly 6 (distributed across 4 battlefields)",
  },
);

export type ColonelBlottoAction = z.infer<typeof colonelBlottoActionSchema>;
