import { ProductName } from "@/app/payment/data";
import { z } from "zod/v3";

export const stripeSessionCreatePayloadSchema = z
  .object({
    productName: z.enum([
      ProductName.TOKENS1M,
      ProductName.PRO1MONTH,
      ProductName.MAX1MONTH,
      ProductName.SUPER1MONTH,
      ProductName.TEAMSEAT1MONTH,
      ProductName.SUPERTEAMSEAT1MONTH,
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
      if (
        data.productName === ProductName.TEAMSEAT1MONTH ||
        data.productName === ProductName.SUPERTEAMSEAT1MONTH
      ) {
        return data.quantity !== undefined;
      } else {
        return data.quantity === undefined;
      }
    },
    {
      message: "quantity is required when productName is TEAMSEAT1MONTH or SUPERTEAMSEAT1MONTH",
      path: ["quantity"],
    },
  );
