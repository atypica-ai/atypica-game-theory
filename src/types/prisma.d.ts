declare module "@/prisma/client" {
  import Stripe from "stripe";
  export * from "@/prisma/client/index";

  export type AnalystReportExtra = {
    coverObjectUrl?: string;
    pdfObjectUrl?: string;
  } | null;

  export type UserChatExtra = {
    clientIp: string;
    userAgent: string;
    locale: string;
    feedback?: {
      rating: string;
      submittedAt: string;
    };
  } | null;

  export type UserSubscriptionExtra = {
    // ... pingxx invoice data tbd
    paymentRecordId: number;
    invoice?: Stripe.Invoice;
  } | null;

  // import { AnalystReport as AnalystReportPrisma } from "@/prisma/client/index";
  // // 只覆盖这个不够，findUnique 返回的类型还是原来的
  // export type AnalystReport = Omit<AnalystReportPrisma, "extra"> & {
  //   extra: {
  //     coverObjectUrl?: string;
  //     pdfObjectUrl?: string;
  //   } | null;
  // };
}
