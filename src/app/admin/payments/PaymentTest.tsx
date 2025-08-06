import { createPingxxCharge } from "@/app/payment/(pingxx)/actions";
import { PaymentMethod, ProductName } from "@/app/payment/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Currency } from "@/prisma/client";
import { Session } from "next-auth";
import Script from "next/script";
import { useState } from "react";

// Define Ping++ global object type
declare global {
  interface Window {
    pingpp: {
      createPayment: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chargeObj: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (result: { status: string; error?: { msg: string; extra: any } }) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extra?: any,
      ) => void;
    };
  }
}

interface PaymentTestProps {
  session: Session | null;
  fetchRecords: () => void;
}

export function PaymentTest({ session, fetchRecords }: PaymentTestProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState("");

  // Initiate payment
  const handlePayment = async (
    method: PaymentMethod,
    productName: ProductName,
    currency: Currency,
  ) => {
    setIsProcessingPayment(true);
    setError("");

    try {
      if (!session?.user) {
        return;
      }
      const { charge } = await createPingxxCharge({
        userId: session.user.id,
        paymentMethod: method,
        productName,
        currency,
        successUrl: window.location.href,
      });
      // Use Ping++ SDK to handle the payment
      if (window.pingpp) {
        window.pingpp.createPayment(charge, function (result) {
          if (result.status === "success") {
            // Payment succeeded
            fetchRecords();
          } else if (result.status === "fail") {
            // Payment failed
            setError(result.error?.msg || "Payment failed");
          } else if (result.status === "cancel") {
            // User cancelled the payment
            setError("Payment was cancelled");
          }
          setIsProcessingPayment(false);
        });
      } else {
        setError("Ping++ SDK not loaded");
        setIsProcessingPayment(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError((err as Error).message);
      setIsProcessingPayment(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payment Testing</h1>
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="lazyOnload"
        onError={() => setError("Failed to load Ping++ SDK")}
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <Tabs defaultValue="alipay_pc_direct" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value={PaymentMethod.alipay_pc_direct}>Alipay PC Direct</TabsTrigger>
          <TabsTrigger value={PaymentMethod.alipay_wap}>Alipay WAP</TabsTrigger>
          <TabsTrigger value={PaymentMethod.stripe}>Stripe Payment</TabsTrigger>
        </TabsList>

        <TabsContent value={PaymentMethod.alipay_pc_direct} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alipay PC Direct Payment</CardTitle>
              <CardDescription>Test PC direct payments with Alipay gateway</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-4">
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_pc_direct, ProductName.TEST_A, Currency.CNY)
                }
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? "Processing..." : "Pay 0.01 CNY"}
              </Button>
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_pc_direct, ProductName.TEST_B, Currency.CNY)
                }
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? "Processing..." : "Pay 0.1 CNY"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={PaymentMethod.alipay_wap} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alipay WAP Payment</CardTitle>
              <CardDescription>
                Test WAP payments with Alipay gateway (mobile browser)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-4">
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_wap, ProductName.TEST_A, Currency.CNY)
                }
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? "Processing..." : "Pay 0.01 CNY"}
              </Button>
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_wap, ProductName.TEST_B, Currency.CNY)
                }
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? "Processing..." : "Pay 0.1 CNY"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value={PaymentMethod.stripe} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Payment</CardTitle>
              <CardDescription>Test WAP payments with Stripe</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-4">
              <form action="/payment/stripe" method="POST">
                <input type="hidden" name="productName" value={ProductName.TEST_A} />
                <input type="hidden" name="currency" value={Currency.USD} />
                <input
                  type="hidden"
                  name="successUrl"
                  value={typeof window !== "undefined" ? window.location.href : ""}
                />
                <Button type="submit" role="link" disabled={isProcessingPayment}>
                  {isProcessingPayment ? "Processing..." : "Checkout 1 USD"}
                </Button>
              </form>
              <form action="/payment/stripe" method="POST">
                <input type="hidden" name="productName" value={ProductName.TEST_B} />
                <input type="hidden" name="currency" value={Currency.USD} />
                <input
                  type="hidden"
                  name="successUrl"
                  value={typeof window !== "undefined" ? window.location.href : ""}
                />
                <Button type="submit" role="link" disabled={isProcessingPayment}>
                  {isProcessingPayment ? "Processing..." : "Checkout 2 USD"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
