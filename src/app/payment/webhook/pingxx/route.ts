import { handleWebhook } from "@/app/payment/actions";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const result = await handleWebhook(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
