"use server";
import { prisma } from "@/lib/prisma";
import { PaymentRecord as PaymentRecordPrisma } from "@prisma/client";
import crypto from "crypto";
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

  const headersList = await headers();
  const clientIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "0.0.0.0";

  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  const product = await prisma.product.findUniqueOrThrow({
    where: { name: productName },
  });
  const lines = [
    {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
      description: product.description,
    },
  ];
  const amount = lines.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const description = lines.map((line) => line.description).join(", ");

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
            success_url: `${process.env.SITE_DEPLOY_ORIGIN}/payment/success?redirect=${encodeURIComponent(successUrl)}`,
            cancel_url: `${process.env.SITE_DEPLOY_ORIGIN}/payment/cancel?redirect=${encodeURIComponent(successUrl)}`,
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

// Verify a Ping++ webhook
export async function verifyWebhook(signature: string, rawBody: string) {
  const pingppPublicKey = process.env.PINGPP_WEBHOOK_PUBLIC_KEY || "";
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawBody, "utf8");
    return verifier.verify(pingppPublicKey, signature, "base64");
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

// Handle webhook from Ping++
export async function handleWebhook(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-pingplusplus-signature") || "";

  // Verify the webhook signature
  const isValid = await verifyWebhook(signature, rawBody);
  if (!isValid) {
    return { status: 400, body: { error: "Invalid signature" } };
  }

  const event = JSON.parse(rawBody);

  // Handle successful payment
  if (event.type === "charge.succeeded") {
    const charge = event.data.object;

    // Update payment record in database
    await prisma.paymentRecord.update({
      where: { chargeId: charge.id },
      data: {
        status: "succeeded",
        paidAt: new Date(),
      },
    });

    await handlePaymentSuccess({ chargeId: charge.id });

    return { status: 200, body: { received: true } };
  }

  // Handle failed payment
  if (event.type === "charge.failed") {
    const charge = event.data.object;

    await prisma.paymentRecord.updateMany({
      where: { chargeId: charge.id },
      data: {
        status: "failed",
      },
    });

    return { status: 200, body: { received: true } };
  }

  return { status: 200, body: { received: true } };
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
      paymentLine.productName === ProductName.POINTS100_D
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
