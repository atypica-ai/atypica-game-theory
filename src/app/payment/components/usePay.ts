import { stripeSessionCreatePayloadSchema } from "@/app/payment/(stripe)/types";
import { PingxxNewPaymentParams, ProductName } from "@/app/payment/data";
import { useDevice } from "@/lib/utils";
import { Currency } from "@/prisma/client";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { z } from "zod";

type StripeSessionCreatePayload = z.input<typeof stripeSessionCreatePayloadSchema>;

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

  // Stripe payment
  const submitForStripePayment = useCallback(
    ({ productName, currency }: Omit<StripeSessionCreatePayload, "successUrl">) => {
      try {
        setLoading(true);
        const params: StripeSessionCreatePayload = {
          productName,
          currency,
          successUrl: /^\/pricing/.test(window.location.pathname)
            ? `${window.location.origin}/account`
            : window.location.href,
        };
        const form = document.createElement("form");
        form.action = "/payment/stripe";
        form.method = "POST";
        const formData = Object.entries(params).map(([key, value]) => ({
          name: key,
          value: value.toString(),
        }));
        for (const item of formData) {
          const input = document.createElement("input");
          input.name = item.name;
          input.value = item.value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } catch (err) {
        setError("Failed to initialize Stripe payment");
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
    }: {
      paymentProvider: PaymentProvider;
      productName:
        | ProductName.TOKENS1M
        | ProductName.PRO1MONTH
        | ProductName.MAX1MONTH
        | ProductName.TEAMSEAT1MONTH;
    }) => {
      if (!session?.user) {
        setError("You must be logged in to make a purchase");
        return;
      }
      if (paymentProvider === PaymentProvider.Stripe) {
        submitForStripePayment({
          productName,
          currency: Currency.USD,
        });
      } else if (paymentProvider === PaymentProvider.StripeCNY) {
        submitForStripePayment({
          productName,
          currency: Currency.CNY,
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
