"use server";
import { getRequestClientIp, getRequestOrigin } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { PaymentRecord as PaymentRecordPrisma } from "@prisma/client";
import { headers } from "next/headers";
import { PaymentMethod, ProductName } from "./constants";

// Ping++ API configuration
const PINGPP_API_KEY = process.env.PINGPP_API_KEY!;
const PINGPP_APP_ID = process.env.PINGPP_APP_ID!;
const PINGPP_API_URL = process.env.PINGPP_API_URL!;

export type PaymentRecord = PaymentRecordPrisma & {
  paymentMethod: PaymentMethod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: Record<"alipay_pc_direct" | "alipay_wap" | "wx_pub", any>;
};

// Create a ping++ charge
export async function createCharge({
  userId,
  paymentMethod,
  productName,
  successUrl,
  openid,
}: {
  userId: number;
  paymentMethod: PaymentMethod;
  productName: ProductName;
  successUrl?: string;
  openid?: string;
}) {
  // const session = await getServerSession(authOptions);
  // if (!session?.user) {
  //   forbidden();
  // }
  // 支付因为要换手机设备打开，不需要登录
  const clientIp = await getRequestClientIp();

  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  const product = await prisma.product.findUniqueOrThrow({
    where: { name: productName },
  });
  if (product.currency !== "CNY") {
    throw new Error("Only CNY currency is supported");
  }
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

export async function handlePaymentSuccess({ chargeId }: { chargeId: string }) {
  const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
    where: { chargeId },
    include: {
      paymentLines: true,
    },
  });
  const userId = paymentRecord.userId;
  await prisma.userPoints.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });
  for (const paymentLine of paymentRecord.paymentLines) {
    if (
      paymentLine.productName === ProductName.POINTS100_A ||
      paymentLine.productName === ProductName.POINTS100_B ||
      paymentLine.productName === ProductName.POINTS100_C ||
      paymentLine.productName === ProductName.POINTS100_D ||
      paymentLine.productName === ProductName.POINTS100_A_GLOBAL ||
      paymentLine.productName === ProductName.POINTS100_B_GLOBAL ||
      paymentLine.productName === ProductName.POINTS100_C_GLOBAL ||
      paymentLine.productName === ProductName.POINTS100_D_GLOBAL
    ) {
      await prisma.$transaction([
        prisma.userPointsLog.create({
          data: {
            userId: userId,
            verb: "recharge",
            resourceType: "PaymentRecord",
            resourceId: paymentRecord.id,
            points: 100,
          },
        }),
        prisma.userPoints.update({
          where: { userId },
          data: {
            balance: {
              increment: 100,
            },
          },
        }),
      ]);
    }
  }
  // end for
}

export async function getProductsForPayment(): Promise<
  ServerActionResult<{ name: ProductName; desc: string; price: number; currency: string }[]>
> {
  const headersList = await headers();
  // TODO: 现在不用阿里云的边缘加速了，没法设置 http 请求超时时间，只能直连 k8s 的 nlb，这样就得自己判断 ip 归属地了
  if ((headersList.get("ali-ip-country") ?? "CN") === "CN") {
    return {
      success: true,
      data: [
        { name: ProductName.POINTS100_A, desc: "挂耳咖啡", price: 7.5, currency: "CNY" },
        { name: ProductName.POINTS100_B, desc: "Manner咖啡", price: 15, currency: "CNY" },
        { name: ProductName.POINTS100_C, desc: "星巴克咖啡", price: 30, currency: "CNY" },
        { name: ProductName.POINTS100_D, desc: "小蓝瓶咖啡", price: 45, currency: "CNY" },
      ],
    };
  } else {
    return {
      success: true,
      data: [
        {
          name: ProductName.POINTS100_A_GLOBAL,
          desc: "A cup of drip coffee",
          price: 1,
          currency: "USD",
        },
        {
          name: ProductName.POINTS100_B_GLOBAL,
          desc: "A Manner Coffee",
          price: 2,
          currency: "USD",
        },
        {
          name: ProductName.POINTS100_C_GLOBAL,
          desc: "A Starbucks Coffee",
          price: 4,
          currency: "USD",
        },
        {
          name: ProductName.POINTS100_D_GLOBAL,
          desc: "A Blue Bottle Coffee",
          price: 6,
          currency: "USD",
        },
      ],
    };
  }
}
