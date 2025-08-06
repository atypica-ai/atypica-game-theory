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
      ProductName.TEAMSEAT1MONTH,
    ]),
    currency: z.enum(["USD", "CNY"]),
    successUrl: z.string().regex(/^https?:\/\/.+$/),
    quantity: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => parseInt(val))
      .refine((val) => val > 0)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.productName === ProductName.TEAMSEAT1MONTH) {
        return data.quantity !== undefined;
      } else {
        return data.quantity === undefined;
      }
    },
    {
      message: "quantity is required when productName is TEAMSEAT1MONTH",
      path: ["quantity"],
    },
  );
