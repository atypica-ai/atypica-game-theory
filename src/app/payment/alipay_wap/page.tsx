import Script from "next/script";
import { ProductName } from "../constants";
import PaymentClient from "./PaymentClient";

export default async function PingxxPaymentPage(props: {
  searchParams: Promise<{
    userId: string;
    productName: string;
    successUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const userId = parseInt(searchParams.userId);
  const productName = searchParams.productName as ProductName;
  const successUrl = searchParams.successUrl;

  return (
    <div>
      <PaymentClient userId={userId} productName={productName} successUrl={successUrl} />
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="beforeInteractive"
      />
    </div>
  );
}
