import { Currency } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  PaymentMethod,
  PingxxNewPaymentParams,
  ProductName,
  StripeNewPaymentParams,
} from "../data";

export function usePay() {
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [paymentScanQR, setPaymentScanQR] = useState<{ url: string; createdAt: Date } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    checkMobile();
  }, []);

  // Pingxx payment
  const createPingxxPaymentUrl = useCallback(
    async ({
      productName,
      currency,
      userId,
      method,
    }: {
      productName: ProductName;
      currency: Currency;
      userId: number;
      method: PaymentMethod;
    }) => {
      try {
        setLoading(true);
        setError(null);
        setPaymentScanQR(null);
        const url = new URL(`${window.location.origin}/payment/new`);
        const params: PingxxNewPaymentParams = {
          userId: userId,
          paymentMethod: method,
          productName: productName,
          currency: currency,
          successUrl: isMobile
            ? encodeURIComponent(`${window.location.origin}/payment/success`) // 因为是弹出二维码在手机上扫码支付，手机上显示固定的支付成功地址
            : encodeURIComponent(window.location.href),
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
    ({
      productName,
      currency,
      userId,
    }: {
      productName: ProductName;
      currency: Currency;
      userId: number;
    }) => {
      try {
        setLoading(true);
        const params: StripeNewPaymentParams = {
          userId: userId,
          productName,
          currency,
          successUrl: window.location.href,
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
      paymentMethod,
      productName,
    }: {
      paymentMethod: PaymentMethod;
      productName: ProductName;
    }) => {
      if (!session?.user) {
        setError("You must be logged in to make a purchase");
        return;
      }
      if (paymentMethod === PaymentMethod.stripe) {
        submitForStripePayment({
          productName,
          currency: Currency.USD,
          userId: session.user.id,
        });
      } else {
        await createPingxxPaymentUrl({
          productName,
          currency: Currency.CNY,
          userId: session.user.id,
          method: paymentMethod,
        });
      }
    },
    [submitForStripePayment, createPingxxPaymentUrl],
  );

  const clearPaymentLink = useCallback(() => {
    if (paymentScanQR) {
      setPaymentScanQR(null);
    }
  }, [paymentScanQR]);

  return {
    createPingxxPaymentUrl,
    submitForStripePayment,
    createPaymentLink,
    clearPaymentLink,
    paymentScanQR,
    loading,
    error,
  };
}
