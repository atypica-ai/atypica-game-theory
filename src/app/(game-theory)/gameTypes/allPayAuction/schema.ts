import z from "zod/v3";

export const allPayAuctionActionSchema = z.object({
  bid: z
    .number()
    .int()
    .min(0)
    .max(150)
    .describe(
      "Your bid amount (0-150). Prize value is 100 points. Highest bidder wins the prize. CRITICAL: Everyone pays their bid, even if you lose.",
    ),
});

export type AllPayAuctionAction = z.infer<typeof allPayAuctionActionSchema>;
