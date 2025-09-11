import "server-only";

import { ProductName } from "@/app/payment/data";
import { PaymentRecord } from "@/prisma/client";
import { recharge1MTokens } from "./permanentTokens";

export const ONCE_RECHARGE_TOKENS = 1_000_000;
export const ONCE_RECHARGE_GIFT = 1_000_000;

/**
 * 通用的支付成功处理函数，目前只有购买 token 一种情况
 * stripe 订阅有关的全部转移到了 (stripe)/success.ts
 * pingxx 购买订阅相关产品现在已经不支持，会报错
 */
export async function handlePaymentSuccess({
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
    throw new Error(`Invalid product name ${productName} received in handlePaymentSuccess`);
  }
}
