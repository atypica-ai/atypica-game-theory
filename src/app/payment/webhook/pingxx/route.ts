import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { handlePaymentSuccess } from "../../actions";

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
    await prisma.paymentRecord.update({
      where: { chargeId: charge.id },
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
