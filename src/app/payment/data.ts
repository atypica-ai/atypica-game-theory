import { Currency } from "@prisma/client";

export enum ProductName {
  TEST_A = "TEST_A",
  TEST_B = "TEST_B",
  // POINTS100_A = "POINTS100_A", // 挂耳咖啡
  // POINTS100_B = "POINTS100_B", // Manner咖啡
  // POINTS100_C = "POINTS100_C", // 星巴克咖啡
  // POINTS100_D = "POINTS100_D", // 小蓝瓶咖啡
  TOKENS1M = "TOKENS1M",
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
  paymentMethod?: PaymentMethod;
  successUrl: string;
};

export type StripeNewPaymentParams = {
  userId: number;
  productName: ProductName;
  currency: Currency;
  successUrl: string;
};
