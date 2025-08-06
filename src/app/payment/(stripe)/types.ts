import { ProductName } from "@/app/payment/data";
import { z } from "zod";

export const stripeSessionCreatePayloadSchema = z
  .object({
    userId: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => parseInt(val)),
    productName: z.enum([
      ProductName.TOKENS1M,
      ProductName.PRO1MONTH,
      ProductName.MAX1MONTH,
      ProductName.TEAMSEAT1M,
    ]),
    currency: z.enum(["USD", "CNY"]),
    successUrl: z.string().regex(/^https?:\/\/.+$/),
    quantity: z.number().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.productName === ProductName.TEAMSEAT1M) {
        return data.quantity !== undefined;
      } else {
        return data.quantity === undefined;
      }
    },
    {
      message: "quantity is required when productName is TEAMSEAT1M",
      path: ["quantity"],
    },
  );

export type StripeSessionCreatePayload = z.infer<typeof stripeSessionCreatePayloadSchema>;
