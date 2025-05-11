import { getRequestOrigin } from "@/lib/request/headers";
import { Currency } from "@/prisma/client";
import { permanentRedirect } from "next/navigation";
import Script from "next/script";
import { PingxxNewPaymentParams, ProductName } from "../data";
import PaymentClient from "./PaymentClient";

async function createWeixinLoginUrl({
  userId,
  productName,
  currency,
  successUrl,
}: PingxxNewPaymentParams) {
  const siteOrigin = await getRequestOrigin();
  const state = `${userId}:${productName}:${currency}`;
  const res = await fetch("https://heidianapi.com/api/clients/wechat-auth-url/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shop": "atypica",
    },
    body: JSON.stringify({
      appid: "wx442ec54730781c2d",
      state: state,
      success_url: successUrl,
      redirect_uri: `${siteOrigin}/payment/wx_pub/`,
    }),
  });
  const data = await res.json();
  // url 是微信的授权链接，用于获取 openid，成功以后会跳回 /payment/wx_pub/
  return { url: data.url };
}

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
    // 微信授权回调后的参数
    code: string;
    state: string;
    // 发起支付的参数
    userId: string;
    productName: string;
    currency: string;
    successUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // 先微信授权获得 openid 以后再继续
  if (!searchParams.code || !searchParams.state) {
    const params: PingxxNewPaymentParams = {
      userId: parseInt(searchParams.userId),
      productName: searchParams.productName as ProductName,
      currency: searchParams.currency as Currency,
      successUrl: searchParams.successUrl,
    };
    const { url: weixinLoginUrl } = await createWeixinLoginUrl(params);
    permanentRedirect(weixinLoginUrl);
  }

  const { code, state } = searchParams;
  const { openid } = await exchangeOpenIDWithCode({ code });

  const splits = state.split(":");
  const userId = parseInt(splits[0]);
  const productName = splits[1] as ProductName;
  const currency = splits[2] as Currency;

  return (
    <div>
      <PaymentClient
        userId={userId}
        productName={productName}
        currency={currency}
        openid={openid}
      />
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="beforeInteractive"
      />
    </div>
  );
}
