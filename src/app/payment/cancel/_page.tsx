"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<{
    chargeId?: string;
    orderId?: string;
  }>({});

  useEffect(() => {
    // Extract payment details from URL if available
    const chargeId = searchParams.get("charge_id");
    const orderId = searchParams.get("order_id");

    setPaymentDetails({
      chargeId: chargeId || undefined,
      orderId: orderId || undefined,
    });
  }, [searchParams]);

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Cancelled</CardTitle>
          <CardDescription className="text-center">
            Your test payment has been cancelled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paymentDetails.orderId && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Order ID:</span>
                <span className="font-mono text-sm">{paymentDetails.orderId}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/admin/payments">Return to Payment Test</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
