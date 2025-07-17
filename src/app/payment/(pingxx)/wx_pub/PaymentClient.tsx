"use client";
import { createPingxxCharge } from "@/app/payment/(pingxx)/actions";
import { PaymentMethod, PingxxNewPaymentParams } from "@/app/payment/data";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("PaymentPage");

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
          toast.success(t("paymentSuccessful"));
        } else if (result.status === "fail") {
          toast.error(t("paymentFailed"));
        } else if (result.status === "cancel") {
          toast.error(t("paymentCancelled"));
        }
      });
    }
  }, [productName, currency, userId, openid, t]);

  useEffect(() => {
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div></div>;
}
