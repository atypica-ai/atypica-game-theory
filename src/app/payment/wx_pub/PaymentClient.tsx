"use client";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createCharge } from "../actions";
import { PaymentMethod, ProductName } from "../constants";

export default function PaymentClient({
  userId,
  productName,
  openid,
}: {
  userId: number;
  productName: ProductName;
  openid: string;
}) {
  const handlePayment = useCallback(async () => {
    const { charge } = await createCharge({
      userId,
      paymentMethod: PaymentMethod.wx_pub,
      productName,
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
  }, [productName, userId, openid]);

  useEffect(() => {
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div></div>;
}
