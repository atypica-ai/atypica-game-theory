import { getRequestOrigin } from "@/lib/headers";
import { Currency } from "@prisma/client";
import { headers } from "next/headers";
import { PaymentMethod, PingxxNewPaymentParams, ProductName } from "../data";

async function createWeixinLoginUrl({
  userId,
  productName,
  currency,
  successUrl,
}: {
  userId: number;
  productName: ProductName;
  currency: Currency;
  successUrl: string;
}) {
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

async function createAlipayLoginUrl({
  userId,
  productName,
  currency,
  successUrl,
}: {
  userId: number;
  productName: ProductName;
  currency: Currency;
  successUrl: string;
}) {
  return {
    url: `/payment/alipay_wap/?userId=${userId}&productName=${productName}&currency=${currency}&successUrl=${successUrl}`,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const params: PingxxNewPaymentParams = {
    userId: parseInt(searchParams.userId),
    productName: searchParams.productName as ProductName,
    currency: searchParams.currency as Currency,
    paymentMethod: searchParams.paymentMethod as PaymentMethod | undefined,
    successUrl: searchParams.successUrl as string,
  };

  const { userId, productName, currency, successUrl } = params;
  let paymentMethod = params.paymentMethod;
  if (!paymentMethod) {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    if (userAgent.toLowerCase().includes("micromessenger")) {
      paymentMethod = PaymentMethod.wx_pub;
    } else {
      paymentMethod = PaymentMethod.alipay_wap;
    }
  }

  if (paymentMethod === PaymentMethod.wx_pub) {
    const { url: weixinLoginUrl } = await createWeixinLoginUrl({
      userId,
      productName,
      currency,
      successUrl,
    });
    return new Response(null, {
      status: 308,
      headers: { Location: weixinLoginUrl },
    });
    // redirect(weixinLoginUrl);
  }
  if (paymentMethod === PaymentMethod.alipay_wap) {
    const { url: alipayLoginUrl } = await createAlipayLoginUrl({
      userId,
      productName,
      currency,
      successUrl,
    });
    return new Response(null, {
      status: 308,
      headers: { Location: alipayLoginUrl },
    });
    // redirect(alipayLoginUrl);
  }
}
