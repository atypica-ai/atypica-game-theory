import { ProductName, StripeNewPaymentParams } from "@/app/payment/data";
import { Currency } from "@/prisma/client";
import { NextResponse } from "next/server";
import { createStripeSession } from "../actions";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const params: StripeNewPaymentParams = {
      userId: parseInt(formData.get("userId") as string),
      productName: formData.get("productName") as string as ProductName,
      currency: formData.get("currency") as string as Currency,
      successUrl: formData.get("successUrl") as string,
    };
    const { sessionUrl } = await createStripeSession(params);
    return NextResponse.redirect(sessionUrl, 303);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: (error as any).statusCode || 500 },
    );
  }
}
