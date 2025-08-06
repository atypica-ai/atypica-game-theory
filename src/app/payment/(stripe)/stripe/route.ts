import { createStripeSession } from "@/app/payment/(stripe)/actions";
import { stripeSessionCreatePayloadSchema } from "@/app/payment/(stripe)/types";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const parseResult = stripeSessionCreatePayloadSchema.safeParse(Object.fromEntries(formData));
    if (!parseResult.success) {
      return NextResponse.json(
        { errors: parseResult.error.errors.map((error) => error.message) },
        { status: 400 },
      );
    }
    const params = parseResult.data;
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
