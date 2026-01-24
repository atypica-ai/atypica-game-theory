"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { getPaymentRecords } from "./actions";
import { PaymentTest } from "./PaymentTest";

type PaymentRecord = ExtractServerActionData<typeof getPaymentRecords>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
  showAll: createParamConfig.boolean(false),
} as const;

export type PaymentsSearchParams = {
  page: number;
  search: string;
  showAll: boolean;
};

interface PaymentsPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function PaymentsPageClient({ initialSearchParams }: PaymentsPageClientProps) {
  const { status, data: session } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [isRecordsLoading, setIsRecordsLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use query params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery, showAll: showAllStatuses },
    setParam,
    setParams,
  } = useListQueryParams<PaymentsSearchParams>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
      showAll: createParamConfig.boolean(false),
    },
    initialValues: initialSearchParams,
  });

  // Fetch payment records
  const fetchRecords = useCallback(async () => {
    setIsRecordsLoading(true);
    const result = await getPaymentRecords(currentPage, searchQuery, showAllStatuses);
    if (!result.success) {
      setError(result.message);
    } else {
      setRecords(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsRecordsLoading(false);
  }, [currentPage, searchQuery, showAllStatuses]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/payments");
    } else if (status === "authenticated") {
      fetchRecords();
    }
  }, [status, router, fetchRecords]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  if (status === "loading") {
    return <div className="container mt-8">Loading...</div>;
  }

  return (
    <div>
      <PaymentTest session={session} fetchRecords={fetchRecords} />
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

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
                  setParams({ search: "", page: 1 });
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
                setParams({ showAll: !showAllStatuses, page: 1 }); // Reset page when filter changes
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
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide">
              {isRecordsLoading ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm">
                    No payment records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono">
                      <div className="text-muted-foreground">{record.orderNo}</div>
                      <div className="text-xs mt-1">{formatDate(record.createdAt, locale)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono">
                      {record.user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-medium">
                      {record.currency === "CNY"
                        ? "¥"
                        : record.currency === "USD"
                          ? "$"
                          : record.currency}
                      {record.amount.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {record.paymentLines.map((line) => (
                        <div key={line.id}>{line.description}</div>
                      ))}
                    </td>
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{record.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setParam("page", page)}
            />
            <div className="text-sm text-muted-foreground">
              Total: {pagination.totalCount.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
