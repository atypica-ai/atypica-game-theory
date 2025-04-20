import { Currency } from "@prisma/client";
import Script from "next/script";
import { ProductName } from "../data";
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
  const userId = parseInt(searchParams.userId);
  const productName = searchParams.productName as ProductName;
  const currency = searchParams.currency as Currency;
  const successUrl = searchParams.successUrl;

  return (
    <div>
      <PaymentClient
        userId={userId}
        productName={productName}
        currency={currency}
        successUrl={successUrl}
      />
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="beforeInteractive"
      />
    </div>
  );
}
