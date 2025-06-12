"use client";
import { createPingxxCharge } from "@/app/payment/(pingxx)/actions";
import { PaymentMethod, PingxxNewPaymentParams } from "@/app/payment/data";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

export default function PaymentClient({
  userId,
  productName,
  currency,
  openid,
}: Omit<PingxxNewPaymentParams, "successUrl"> & {
  openid: string;
}) {
  const handlePayment = useCallback(async () => {
    const { charge } = await createPingxxCharge({
      userId,
      paymentMethod: PaymentMethod.wx_pub,
      productName,
      currency,
      openid: openid,
    });
    if (window.pingpp) {
      window.pingpp.createPayment(charge, function (result) {
        if (result.status === "success") {
          toast.error("Payment successful");
        } else if (result.status === "fail") {
          toast.error("Payment failed");
        } else if (result.status === "cancel") {
          toast.error("Payment cancelled");
        }
      });
    }
  }, [productName, currency, userId, openid]);

  useEffect(() => {
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div></div>;
}
