"use client";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createCharge } from "../actions";
import { PaymentMethod, ProductName } from "../constants";

export default function PaymentClient({
  userId,
  productName,
  successUrl,
}: {
  userId: number;
  productName: ProductName;
  successUrl: string;
}) {
  const handlePayment = useCallback(async () => {
    const { charge } = await createCharge({
      userId,
      paymentMethod: PaymentMethod.alipay_wap,
      productName,
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
  }, [productName, successUrl, userId]);

  useEffect(() => {
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div></div>;
}
