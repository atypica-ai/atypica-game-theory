"use client";
import { createCharge, getPaymentRecords, PaymentRecord } from "@/app/payment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

// Define Ping++ global object type
declare global {
  interface Window {
    pingpp: {
      createPayment: (
        chargeObj: any,
        callback: (result: { status: string; error?: { msg: string; extra: any } }) => void,
        extra?: any,
      ) => void;
    };
  }
}

type PaymentMethod = "alipay_pc_direct" | "alipay_wap";

export default function PaymentTestPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  // const [paymentResponse, setPaymentResponse] = useState<any>(null);

  // Fetch payment records on load
  const fetchRecords = useCallback(async () => {
    try {
      const result = await getPaymentRecords();
      setRecords(result.data);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchRecords();
    }
  }, [status, router, fetchRecords]);

  // Initiate payment
  const handlePayment = async (method: PaymentMethod, amount: number) => {
    setIsLoading(true);
    setError("");

    try {
      const description = `Test Payment - ${method === "alipay_pc_direct" ? "PC Direct" : "WAP"} - ${amount} CNY`;
      const { charge } = await createCharge(method, Math.floor(amount * 100), description);

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
          setIsLoading(false);
        });
      } else {
        setError("Ping++ SDK not loaded");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="container mt-8">Loading...</div>;
  }

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alipay_pc_direct">Alipay PC Direct</TabsTrigger>
          <TabsTrigger value="alipay_wap">Alipay WAP</TabsTrigger>
        </TabsList>

        <TabsContent value="alipay_pc_direct" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alipay PC Direct Payment</CardTitle>
              <CardDescription>Test PC direct payments with Alipay gateway</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-4">
              <Button onClick={() => handlePayment("alipay_pc_direct", 0.01)} disabled={isLoading}>
                Pay 0.01 CNY
              </Button>
              <Button onClick={() => handlePayment("alipay_pc_direct", 0.1)} disabled={isLoading}>
                Pay 0.1 CNY
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alipay_wap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alipay WAP Payment</CardTitle>
              <CardDescription>
                Test WAP payments with Alipay gateway (mobile browser)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-4">
              <Button onClick={() => handlePayment("alipay_wap", 0.01)} disabled={isLoading}>
                Pay 0.01 CNY
              </Button>
              <Button onClick={() => handlePayment("alipay_wap", 0.1)} disabled={isLoading}>
                Pay 0.1 CNY
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Recent Payment Records</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm">
                    No payment records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono">
                      {record.orderNo}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {record.amount.toFixed(2)} CNY
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{record.paymentMethod}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          record.status === "succeeded"
                            ? "bg-green-100 text-green-800"
                            : record.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
