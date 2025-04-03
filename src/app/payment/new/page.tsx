import { redirect } from "next/navigation";
import { PaymentMethod, ProductName } from "../constants";

export async function createWeixinLoginUrl({
  state,
  successUrl,
}: {
  state: string;
  successUrl: string;
}) {
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
      redirect_uri: `${process.env.PINGPP_NOTIFY_URL_BASE}/payment/wx_pub/`,
    }),
  });
  const data = await res.json();
  return { url: data.url };
}

export default async function PingxxPaymentPage(props: {
  searchParams: Promise<{
    userId: number;
    productName: ProductName;
    paymentMethod?: PaymentMethod;
    successUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { userId, productName, paymentMethod, successUrl } = searchParams;
  const state = `${userId}:${productName}`;
  if (paymentMethod === PaymentMethod.wx_pub) {
    const { url: weixinLoginUrl } = await createWeixinLoginUrl({
      state,
      successUrl,
    });
    redirect(weixinLoginUrl);
  }
  if (paymentMethod === PaymentMethod.alipay_wap) {
    redirect(
      `/payment/alipay_wap/?userId=${userId}&productName=${productName}&successUrl=${successUrl}`,
    );
  }
  return <div></div>;
}
