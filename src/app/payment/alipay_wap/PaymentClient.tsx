"use client";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createCharge } from "../actions";
import { PaymentMethod, PingxxNewPaymentParams } from "../data";

export default function PaymentClient({
  userId,
  productName,
  currency,
  successUrl,
}: PingxxNewPaymentParams) {
  const handlePayment = useCallback(async () => {
    const { charge } = await createCharge({
      userId,
      paymentMethod: PaymentMethod.alipay_wap,
      productName,
      currency,
      successUrl: successUrl,
    });
    if (window.pingpp) {
      window.pingpp.createPayment(charge, function (result) {
        if (result.status === "success") {
          toast.success("Payment successful");
        } else if (result.status === "fail") {
          toast.error("Payment failed");
        } else if (result.status === "cancel") {
          toast.error("Payment cancelled");
        }
      });
    }
  }, [productName, successUrl, currency, userId]);

  useEffect(() => {
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div></div>;
}
