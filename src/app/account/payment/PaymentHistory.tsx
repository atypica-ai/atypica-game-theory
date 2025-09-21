"use client";
import { fetchPaymentRecords } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { DownloadIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
} as const;

export type PaymentHistorySearchParams = {
  page: number;
};

interface PaymentHistoryClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function PaymentHistory({ initialSearchParams }: PaymentHistoryClientProps) {
  const t = useTranslations("AccountPage.paymentRecordsSection");
  const locale = useLocale();
  const [paymentRecords, setPaymentRecords] = useState<
    ExtractServerActionData<typeof fetchPaymentRecords>
  >([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);

  // Use query params hook for URL synchronization
  const {
    values: { page: currentPage },
    setParam,
  } = useListQueryParams<PaymentHistorySearchParams>({
    params: {
      page: createParamConfig.number(1),
    },
    initialValues: initialSearchParams,
  });

  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    setHistoryIsLoading(true);
    try {
      const result = await fetchPaymentRecords(currentPage, 10);
      if (result.success) {
        setPaymentRecords(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
    } finally {
      setHistoryIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadPaymentHistory();
  }, [loadPaymentHistory]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <div>
        {historyIsLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : paymentRecords.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">{t("noRecords")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("details")}</TableHead>
                <TableHead>{t("status.title")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="text-center">{t("date")}</TableHead>
                <TableHead className="text-center">{t("invoice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRecords.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>{item.orderNo}</div>
                    <div className="text-zinc-500">{item.description}</div>
                  </TableCell>
                  <TableCell>
                    {item.status === "succeeded" ? (
                      <span className="font-medium text-green-500">{t("status.success")}</span>
                    ) : item.status === "pending" ? (
                      <span className="font-medium text-yellow-500">{t("status.pending")}</span>
                    ) : item.status === "failed" ? (
                      <span className="font-medium text-red-500">{t("status.failed")}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.currency === "CNY" ? "¥" : item.currency === "USD" ? "$" : ""}
                    {item.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatDate(item.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.stripeInvoice?.hosted_invoice_url ? (
                      <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                        <Link href={item.stripeInvoice.hosted_invoice_url} target="_blank">
                          <DownloadIcon className="size-4" />
                          {t("downloadInvoice")}
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setParam("page", page)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
