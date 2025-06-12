import { PaymentMethod, PingxxNewPaymentParams, ProductName } from "@/app/payment/data";
import { Currency } from "@/prisma/client";
import Script from "next/script";
import PaymentClient from "./PaymentClient";

export default async function PingxxPaymentPage(props: {
  searchParams: Promise<{
    userId: string;
    productName: string;
    currency: string;
    successUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const params: PingxxNewPaymentParams = {
    userId: parseInt(searchParams.userId),
    productName: searchParams.productName as ProductName,
    paymentMethod: PaymentMethod.alipay_wap,
    currency: searchParams.currency as Currency,
    successUrl: searchParams.successUrl,
  };

  return (
    <div>
      <PaymentClient {...params} />
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="beforeInteractive"
      />
    </div>
  );
}
