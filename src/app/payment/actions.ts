"use server";
import { checkAdminAuth } from "@/app/admin/utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentRecord as PaymentRecordPrisma } from "@prisma/client";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { forbidden } from "next/navigation";

// Ping++ API configuration
const PINGPP_API_KEY = process.env.PINGPP_API_KEY!;
const PINGPP_APP_ID = process.env.PINGPP_APP_ID!;
const PINGPP_API_URL = process.env.PINGPP_API_URL!;

export type PaymentRecord = PaymentRecordPrisma & {
  status: "pending" | "succeeded" | "failed";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: Record<"alipay_pc_direct" | "alipay_wap", any>;
};

// Create a ping++ charge
export async function createCharge(
  type: "alipay_pc_direct" | "alipay_wap",
  amount: number, // Amount in cents (e.g., 1000 = 10.00 CNY)
  description: string,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  const headersList = await headers();
  const clientIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "0.0.0.0";

  // Generate a unique order number
  const orderNo = `atp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Create the charge data
  const chargeData = {
    order_no: orderNo,
    app: { id: PINGPP_APP_ID },
    channel: type,
    amount: amount, // Amount in cents (e.g., 1000 = 10.00 CNY)
    currency: "cny",
    client_ip: clientIp,
    subject: "atypica.LLM",
    body: description,
    extra:
      type === "alipay_pc_direct" || "alipay_wap"
        ? {
            success_url: `${process.env.PINGPP_NOTIFY_URL_BASE}/payment/success`,
            cancel_url: `${process.env.PINGPP_NOTIFY_URL_BASE}/payment/cancel`,
          }
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
  await prisma.paymentRecord.create({
    data: {
      userId: session.user.id,
      orderNo: orderNo,
      amount: amount / 100, // Convert cents to yuan
      status: "pending",
      paymentMethod: type,
      chargeId: chargeResult.id,
      charge: { ...chargeResult },
      credential: { ...chargeResult.credential },
      description: description,
    },
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
    await prisma.paymentRecord.updateMany({
      where: { chargeId: charge.id },
      data: {
        status: "succeeded",
        paidAt: new Date(),
      },
    });

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

// Get payment records for display
export async function getPaymentRecords() {
  await checkAdminAuth();

  const records = await prisma.paymentRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return { data: records as PaymentRecord[] };
}
