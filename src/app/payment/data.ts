import { TDeployRegion } from "@/lib/request/deployRegion";
import { Currency } from "@/prisma/client";

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
  SUPER1MONTH = "SUPER1MONTH",
  TEAMSEAT1MONTH = "TEAMSEAT1MONTH",
  SUPERTEAMSEAT1MONTH = "SUPERTEAMSEAT1MONTH",
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

export type StripeMetadata = {
  project: "atypica";
  deployRegion: TDeployRegion;
  orderNo: string;
  productName: ProductName;
  invoiceType?: "ProToMaxUpgrade" | "PlanUpgrade"; // 升级订阅的时候才有
  lineType?: "Plan" | "UpgradeDiscount"; // 升级订阅的时候，有两个 line，一个是
};
