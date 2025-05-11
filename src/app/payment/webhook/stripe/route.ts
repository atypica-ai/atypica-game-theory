import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handlePaymentSuccess } from "../../actions";

export async function POST(req: Request) {
  const payloadStr = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event;
  try {
    event = stripe.webhooks.constructEvent(payloadStr, sig, endpointSecret);
  } catch (error) {
    console.log(error);
    return new Response("Webhook Error", { status: 400 });
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const sessionId = event.data.object.id;
      await prisma.paymentRecord.update({
        where: { chargeId: sessionId },
        data: {
          status: "succeeded",
          paidAt: new Date(),
        },
      });
      await handlePaymentSuccess({
        chargeId: sessionId,
      });
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
