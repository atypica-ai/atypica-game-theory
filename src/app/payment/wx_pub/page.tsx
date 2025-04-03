import Script from "next/script";
import { ProductName } from "../constants";
import PaymentClient from "./PaymentClient";

async function exchangeOpenIDWithCode({ code }: { code: string }) {
  const response = await fetch("https://heidianapi.com/api/clients/wechat-auth-openid/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appid: "wx442ec54730781c2d",
      code: code,
    }),
  });
  const data = await response.json();
  return { openid: data.openid };
}

export default async function PingxxPaymentPage(props: {
  searchParams: Promise<{
    code: string;
    state: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { code, state } = searchParams;
  const { openid } = await exchangeOpenIDWithCode({ code });

  const splits = state.split(":");
  const userId = parseInt(splits[0]);
  const productName = splits[1] as ProductName;

  return (
    <div>
      <PaymentClient userId={userId} productName={productName} openid={openid} />
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="beforeInteractive"
      />
    </div>
  );
}
