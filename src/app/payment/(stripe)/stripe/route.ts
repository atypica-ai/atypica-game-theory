import authOptions from "@/app/(auth)/authOptions";
import { AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN } from "@/app/(aws)/config";
import {
  createPaymentStripeSession,
  createSubscriptionStripeSession,
  createTeamSubscriptionStripeSession,
} from "@/app/payment/(stripe)/create";
import { stripeSessionCreatePayloadSchema } from "@/app/payment/(stripe)/types";
import { ProductName } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  // Block AWS Marketplace users from purchasing
  if (session.user.email.endsWith(AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN)) {
    rootLogger.error({
      msg: `AWS Marketplace user attempted to purchase a subscription`,
      user: session.user.id,
    });
    return NextResponse.json(
      { error: "AWS Marketplace users cannot purchase subscriptions" },
      { status: 403 },
    );
  }
  try {
    const formData = await req.formData();
    const parseResult = stripeSessionCreatePayloadSchema.safeParse(Object.fromEntries(formData));
    if (!parseResult.success) {
      rootLogger.error({
        msg: `Failed to parse Stripe session creation payload`,
        user: session.user.id,
        payload: Object.fromEntries(formData),
      });
      return NextResponse.json(
        { errors: parseResult.error.errors.map((error) => error.message) },
        { status: 400 },
      );
    }
    const { productName, ...params } = parseResult.data;
    let sessionResponse: { sessionUrl: string };
    if (
      productName === ProductName.PRO1MONTH ||
      productName === ProductName.MAX1MONTH ||
      productName === ProductName.SUPER1MONTH
    ) {
      sessionResponse = await createSubscriptionStripeSession({ ...params, userId, productName });
    } else if (productName === ProductName.TOKENS1M) {
      sessionResponse = await createPaymentStripeSession({ ...params, userId, productName });
    } else if (
      productName === ProductName.TEAMSEAT1MONTH ||
      productName === ProductName.SUPERTEAMSEAT1MONTH
    ) {
      const quantity = params.quantity!; // 前面校验过了，不会有问题
      sessionResponse = await createTeamSubscriptionStripeSession({
        ...params,
        userId,
        productName,
        quantity,
      });
    } else {
      rootLogger.error({ msg: `Invalid product name`, user: session.user.id, productName });
      return NextResponse.json({ error: "Invalid product name" }, { status: 400 });
    }
    return NextResponse.redirect(sessionResponse.sessionUrl, 303);
  } catch (error) {
    rootLogger.error({
      msg: `Failed to create Stripe session`,
      user: session.user.id,
      error,
    });
    return NextResponse.json(
      { error: (error as Error).message },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: (error as any).statusCode || 500 },
    );
  }
}
