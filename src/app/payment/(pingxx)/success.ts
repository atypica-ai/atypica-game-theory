import "server-only";

import { ProductName } from "@/app/payment/data";
import { recharge1MTokens } from "@/app/payment/permanentTokens";
import { PaymentRecord } from "@/prisma/client";

export async function handleRechargePaymentSuccess({
  paymentRecord,
  productName,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName;
}) {
  const userId = paymentRecord.userId;
  if (productName === ProductName.TOKENS1M) {
    // recharge 1M tokens
    await recharge1MTokens({ userId, paymentRecordId: paymentRecord.id });
  } else {
    throw new Error(`Invalid product name ${productName} received in handleRechargePaymentSuccess`);
  }
}
