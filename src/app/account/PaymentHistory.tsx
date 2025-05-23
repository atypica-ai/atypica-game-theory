"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { DownloadIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPaymentRecords } from "./actions";

export function PaymentHistory() {
  const t = useTranslations("AccountPage.paymentRecordsSection");
  const locale = useLocale();
  const [paymentRecords, setPaymentRecords] = useState<
    ExtractServerActionData<typeof fetchPaymentRecords>
  >([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  // Fetch token history when the component mounts or page changes
  useEffect(() => {
    async function loadTokensHistory() {
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
        console.error("Failed to fetch tokens history:", error);
      } finally {
        setHistoryIsLoading(false);
      }
    }
    loadTokensHistory();
  }, [currentPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {/* <CardDescription>Recent token transactions</CardDescription> */}
      </CardHeader>
      <CardContent>
        {historyIsLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : paymentRecords.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">{t("noRecords")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("details")}</TableHead>
                <TableHead>{t("status.title")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="text-center">{t("invoice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRecords.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.createdAt, locale)}</TableCell>
                  <TableCell>{item.description}</TableCell>
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
                    {item.charge?.invoice?.hosted_invoice_url ? (
                      <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                        <Link href={item.charge.invoice.hosted_invoice_url} target="_blank">
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

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
