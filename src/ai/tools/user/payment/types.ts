import z from "zod/v3";

export const requestPaymentInputSchema = z.object({});

export const requestPaymentOutputSchema = z.object({
  plainText: z.string(),
});

export type RequestPaymentResult = z.infer<typeof requestPaymentOutputSchema>;
