"use client";
import { createCharge } from "@/app/payment/actions";
import { PaymentMethod, ProductName } from "@/app/payment/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Currency } from "@prisma/client";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../utils";
import { getPaymentRecords } from "./actions";

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

type PaymentRecord = ExtractServerActionData<typeof getPaymentRecords>[number];

export default function PaymentTestPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");
      const statusParam = url.searchParams.get("showAll");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
      if (statusParam === "true") {
        setShowAllStatuses(true);
      }
    }
  }, []);

  // Update URL when page, search or status filter changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }
    if (showAllStatuses) {
      url.searchParams.set("showAll", "true");
    } else {
      url.searchParams.delete("showAll");
    }
    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery, showAllStatuses]);

  // Fetch payment records on load
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    const result = await getPaymentRecords(currentPage, searchQuery, showAllStatuses);
    if (!result.success) {
      setError(result.message);
    } else {
      setRecords(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, showAllStatuses]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/payments");
    } else if (status === "authenticated") {
      fetchRecords();
    }
  }, [status, router, fetchRecords]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  // Initiate payment
  const handlePayment = async (
    method: PaymentMethod,
    productName: ProductName,
    currency: Currency,
  ) => {
    setIsLoading(true);
    setError("");

    try {
      if (!session?.user) {
        return;
      }
      const { charge } = await createCharge({
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
                disabled={isLoading}
              >
                Pay 0.01 CNY
              </Button>
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_pc_direct, ProductName.TEST_B, Currency.CNY)
                }
                disabled={isLoading}
              >
                Pay 0.1 CNY
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
                disabled={isLoading}
              >
                Pay 0.01 CNY
              </Button>
              <Button
                onClick={() =>
                  handlePayment(PaymentMethod.alipay_wap, ProductName.TEST_B, Currency.CNY)
                }
                disabled={isLoading}
              >
                Pay 0.1 CNY
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
                <input type="hidden" name="userId" value={session?.user?.id} />
                <input type="hidden" name="productName" value={ProductName.TEST_A} />
                <input type="hidden" name="currency" value={Currency.USD} />
                <input
                  type="hidden"
                  name="successUrl"
                  value={typeof window !== "undefined" ? window.location.href : ""}
                />
                <Button type="submit" role="link">
                  Checkout 1 USD
                </Button>
              </form>
              <form action="/payment/stripe" method="POST">
                <input type="hidden" name="userId" value={session?.user?.id} />
                <input type="hidden" name="productName" value={ProductName.TEST_B} />
                <input type="hidden" name="currency" value={Currency.USD} />
                <input
                  type="hidden"
                  name="successUrl"
                  value={typeof window !== "undefined" ? window.location.href : ""}
                />
                <Button type="submit" role="link">
                  Checkout 2 USD
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Recent Payment Records</h2>

        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                defaultValue={searchQuery}
                ref={inputRef}
                placeholder="Search by order number or email..."
                className="pl-8"
              />
            </div>
            <Button type="submit">Search</Button>
            {searchQuery && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </form>
          <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="showAllStatuses"
              checked={showAllStatuses}
              onChange={() => {
                setShowAllStatuses(!showAllStatuses);
                setCurrentPage(1); // Reset page when filter changes
              }}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="showAllStatuses" className="text-sm text-muted-foreground">
              Show all payment statuses (including pending and failed)
            </label>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Product
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono">
                      {record.user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {record.paymentLines.map((line) => (
                        <div key={line.id}>{line.description}</div>
                      ))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {record.amount.toFixed(2)} {record.currency}
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
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
