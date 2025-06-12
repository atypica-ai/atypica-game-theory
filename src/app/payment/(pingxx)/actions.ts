"use server";
import { PaymentMethod, ProductName } from "@/app/payment/data";
import { getRequestClientIp, getRequestOrigin } from "@/lib/request/headers";
import { Currency } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

// Ping++ API configuration
const PINGPP_API_KEY = process.env.PINGPP_API_KEY!;
const PINGPP_APP_ID = process.env.PINGPP_APP_ID!;
const PINGPP_API_URL = process.env.PINGPP_API_URL!;

export async function createPingxxCharge({
  userId,
  paymentMethod,
  productName,
  currency,
  successUrl,
  openid,
}: {
  userId: number;
  paymentMethod: PaymentMethod;
  productName: ProductName;
  currency: Currency;
  successUrl?: string;
  openid?: string;
}) {
  if (currency !== "CNY") {
    throw new Error("Only CNY currency is supported");
  }
  // const session = await getServerSession(authOptions);
  // if (!session?.user) {
  //   forbidden();
  // }
  // 支付因为要换手机设备打开，不需要登录

  if (productName === ProductName.TOKENS1M) {
    // 只有会员才能充值
    const now = new Date();
    const subscription = await prisma.userSubscription.findFirst({
      where: { userId, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { endsAt: "desc" },
    });
    if (!subscription) {
      throw new Error("Recharge is only available to users with a valid subscription");
    }
  }

  const clientIp = await getRequestClientIp();

  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: {
        name: productName,
        currency: currency,
      },
    },
  });
  const lines = [
    {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
      currency: product.currency,
      description: product.description,
    },
  ];
  const amount = lines.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const description = lines.map((line) => line.description).join(", ");
  const siteOrigin = await getRequestOrigin();

  // Create the charge data
  const chargeData = {
    order_no: orderNo,
    app: { id: PINGPP_APP_ID },
    channel: paymentMethod,
    amount: Math.floor(amount * 100), // Amount in cents (e.g., 1000 = 10.00 CNY)
    currency: "cny",
    client_ip: clientIp,
    subject: "atypica.AI",
    body: description,
    extra:
      (paymentMethod === PaymentMethod.alipay_pc_direct ||
        paymentMethod === PaymentMethod.alipay_wap) &&
      successUrl
        ? {
            success_url: `${siteOrigin}/payment/success?redirect=${encodeURIComponent(successUrl)}`,
            cancel_url: `${siteOrigin}/payment/cancel?redirect=${encodeURIComponent(successUrl)}`,
          }
        : paymentMethod === PaymentMethod.wx_pub && openid
          ? { open_id: openid } // pingxx 的参数叫 open_id
          : {},
  };

  // Call the Ping++ API to create a charge
  const response = await fetch(PINGPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINGPP_API_KEY}`,
    },
    body: JSON.stringify(chargeData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Ping++ API error: ${JSON.stringify(errorData)}`);
  }

  const chargeResult = await response.json();
  if (!chargeResult.id || !chargeResult.credential) {
    throw new Error("Invalid charge result");
  }

  // Save the charge record to database
  const paymentRecord = await prisma.paymentRecord.create({
    data: {
      userId: userId,
      orderNo: orderNo,
      amount: amount, // Convert cents to yuan
      currency: product.currency,
      status: "pending",
      paymentMethod: paymentMethod,
      chargeId: chargeResult.id,
      charge: { ...chargeResult },
      credential: { ...chargeResult.credential },
      description: description,
    },
  });

  await prisma.paymentLine.createMany({
    data: lines.map((line) => ({
      paymentRecordId: paymentRecord.id,
      ...line,
    })),
  });

  return {
    charge: chargeResult,
  };
}
