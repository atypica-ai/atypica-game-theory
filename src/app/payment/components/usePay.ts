import { createStripeSessionAction } from "@/app/payment/(stripe)/actions";
import { PingxxNewPaymentParams, ProductName } from "@/app/payment/data";
import { useDevice } from "@/hooks/use-device";
import { Currency } from "@/prisma/client";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

export enum PaymentProvider {
  Stripe = "Stripe",
  StripeCNY = "StripeCNY",
  Pingxx = "Pingxx",
}

export function usePay() {
  const { data: session } = useSession();
  const [paymentScanQR, setPaymentScanQR] = useState<{ url: string; createdAt: Date } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useDevice();

  // Pingxx payment
  const createPingxxPaymentUrl = useCallback(
    async ({
      productName,
      currency,
      userId,
      // paymentMethod, // 扫码自动判断渠道，不需要传
    }: Omit<PingxxNewPaymentParams, "paymentMethod">) => {
      try {
        setLoading(true);
        setError(null);
        setPaymentScanQR(null);
        const url = new URL(`${window.location.origin}/payment/auto-redirect`);
        const params: Omit<PingxxNewPaymentParams, "paymentMethod"> = {
          userId,
          // paymentMethod,
          productName,
          currency,
          successUrl: isMobile
            ? encodeURIComponent(window.location.href) // 手机端支付，付款以后跳转回当前页面
            : encodeURIComponent(`${window.location.origin}/payment/success`), // PC 端支付，手机扫码，付款以后显示固定的支付成功地址
        };
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, value.toString());
        });
        url.search = searchParams.toString();
        if (isMobile) {
          window.location.href = url.toString();
        } else {
          setPaymentScanQR({ url: url.toString(), createdAt: new Date() });
        }
      } catch (err) {
        setError("Failed to create payment URL");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [isMobile],
  );

  // Stripe payment via Server Action
  const submitForStripePayment = useCallback(
    async ({
      productName,
      currency,
      quantity,
      couponId,
    }: {
      productName: ProductName;
      currency: "USD" | "CNY";
      quantity?: number;
      couponId?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const successUrl = /^\/pricing/.test(window.location.pathname)
          ? `${window.location.origin}/account`
          : window.location.href;
        const result = await createStripeSessionAction({
          productName,
          currency,
          successUrl,
          quantity,
          couponId,
        });
        if (!result.success) {
          throw new Error(result.message);
        }
        window.location.href = result.data.sessionUrl;
      } catch (err) {
        setError((err as Error).message || "Failed to initialize Stripe payment");
        console.error(err);
        setLoading(false);
      }
    },
    [],
  );

  // Handle payment initiation
  const createPaymentLink = useCallback(
    async ({
      paymentProvider,
      productName,
      quantity,
      couponId,
    }: {
      paymentProvider: PaymentProvider;
      productName:
        | ProductName.TOKENS1M
        | ProductName.PRO1MONTH
        | ProductName.MAX1MONTH
        | ProductName.SUPER1MONTH
        | ProductName.TEAMSEAT1MONTH
        | ProductName.SUPERTEAMSEAT1MONTH;
      quantity?: number;
      couponId?: string;
    }) => {
      if (!session?.user) {
        setError("You must be logged in to make a purchase");
        return;
      }
      if (paymentProvider === PaymentProvider.Stripe) {
        await submitForStripePayment({
          productName,
          currency: "USD",
          quantity,
          couponId,
        });
      } else if (paymentProvider === PaymentProvider.StripeCNY) {
        await submitForStripePayment({
          productName,
          currency: "CNY",
          quantity,
          couponId,
        });
      } else {
        await createPingxxPaymentUrl({
          productName,
          currency: Currency.CNY,
          userId: session.user.id,
        });
      }
    },
    [submitForStripePayment, createPingxxPaymentUrl, session?.user],
  );

  const clearPaymentLink = useCallback(() => {
    if (paymentScanQR) {
      setPaymentScanQR(null);
    }
  }, [paymentScanQR]);

  return {
    // createPingxxPaymentUrl,
    // submitForStripePayment,
    createPaymentLink,
    clearPaymentLink,
    paymentScanQR,
    loading,
    error,
  };
}
