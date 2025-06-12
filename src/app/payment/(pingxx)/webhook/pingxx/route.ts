import { ProductName } from "@/app/payment/data";
import { handlePaymentSuccess } from "@/app/payment/lib";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Verify a Ping++ webhook
async function verifyWebhook(signature: string, rawBody: string) {
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
async function handleWebhook(request: Request) {
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
    try {
      await prisma.paymentRecord.update({
        where: {
          chargeId: charge.id,
          status: "pending", // 确保 pending -> succeeded 只更新一次
        },
        data: {
          status: "succeeded",
          paidAt: new Date(),
        },
      });
    } catch (error) {
      rootLogger.error(
        `Duplicate webhook detected for chargeId ${charge.id}: ${(error as Error).message}`,
      );
      return new Response("Duplicate webhook received", { status: 400 });
    }
    const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
      where: { chargeId: charge.id, status: "succeeded" },
      include: { paymentLines: true },
    });
    for (const paymentLine of paymentRecord.paymentLines) {
      // 其实不会有多行
      await handlePaymentSuccess({
        paymentRecord,
        productName: paymentLine.productName as ProductName,
      });
    }
    return { status: 200, body: { received: true } };
  }

  // Handle failed payment
  if (event.type === "charge.failed") {
    const charge = event.data.object;
    await prisma.paymentRecord.update({
      where: {
        chargeId: charge.id,
        status: "pending", // 确保 pending -> succeeded 只更新一次
      },
      data: {
        status: "failed",
      },
    });
    return { status: 200, body: { received: true } };
  }

  return { status: 200, body: { received: true } };
}

export async function POST(request: Request) {
  try {
    const result = await handleWebhook(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
