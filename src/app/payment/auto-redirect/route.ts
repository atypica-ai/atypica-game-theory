import { Currency } from "@/prisma/client";
import { headers } from "next/headers";
import { PaymentMethod, PingxxNewPaymentParams, ProductName } from "../data";

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
    return new Response(null, {
      status: 308,
      headers: {
        Location: `/payment/wx_pub/?userId=${userId}&productName=${productName}&currency=${currency}&successUrl=${successUrl}`,
      },
    });
  }
  if (paymentMethod === PaymentMethod.alipay_wap) {
    return new Response(null, {
      status: 308,
      headers: {
        Location: `/payment/alipay_wap/?userId=${userId}&productName=${productName}&currency=${currency}&successUrl=${successUrl}`,
      },
    });
  }
}
