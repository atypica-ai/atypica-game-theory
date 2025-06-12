import { TDeployRegion } from "@/lib/request/deployRegion";
import { Currency, PaymentRecord as PaymentRecordPrisma } from "@/prisma/client";
import Stripe from "stripe";

export enum ProductName {
  TEST_A = "TEST_A",
  TEST_B = "TEST_B",
  // POINTS100_A = "POINTS100_A", // 挂耳咖啡
  // POINTS100_B = "POINTS100_B", // Manner咖啡
  // POINTS100_C = "POINTS100_C", // 星巴克咖啡
  // POINTS100_D = "POINTS100_D", // 小蓝瓶咖啡
  TOKENS1M = "TOKENS1M",
  PRO1MONTH = "PRO1MONTH",
  MAX1MONTH = "MAX1MONTH",
}

export enum PaymentMethod {
  wx_pub = "wx_pub",
  alipay_wap = "alipay_wap",
  alipay_pc_direct = "alipay_pc_direct",
  stripe = "stripe",
}

export type PingxxNewPaymentParams = {
  userId: number;
  productName: ProductName;
  currency: Currency;
  paymentMethod: PaymentMethod;
  successUrl?: string;
  openid?: string;
};

export type StripeNewPaymentParams = {
  userId: number;
  productName: ProductName;
  currency: Currency;
  successUrl: string;
};

export type PaymentChargeData = {
  // 这里只定义 stripe 相关的字段，ping++ 的那些支付以后一般用不到了，如果需要，就在这里定义
  // ... pingxx charge data
  invoice?: Stripe.Invoice;
};

export type PaymentRecord = Omit<PaymentRecordPrisma, "paymentMethod" | "charge" | "credential"> & {
  paymentMethod: PaymentMethod;
  charge: PaymentChargeData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: Record<"alipay_pc_direct" | "alipay_wap" | "wx_pub", any> | null;
};

export type StripeMetadata = {
  project: "atypica";
  deployRegion: TDeployRegion;
  orderNo: string;
  productName: ProductName;
};
