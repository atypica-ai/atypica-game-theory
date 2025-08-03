"use client";
import { fetchTokensHistory } from "@/app/(account)/account/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate } from "@/lib/utils";
import { UserTokensLog, UserTokensLogVerb } from "@/prisma/client";
import {
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GiftIcon,
  User2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function TokensHistory() {
  const t = useTranslations("AccountPage");
  const locale = useLocale();
  const [tokensHistory, setTokensHistory] = useState<UserTokensLog[]>([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number | null>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      } else {
        setCurrentPage(1);
      }
    }
  }, []);

  // Update URL when page changes (but only if page > 1)
  useEffect(() => {
    if (currentPage === null) return;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (currentPage > 1) {
        url.searchParams.set("page", currentPage.toString());
      } else {
        url.searchParams.delete("page");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [currentPage]);

  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadTokensHistory = useCallback(async () => {
    if (currentPage === null) return;
    setHistoryIsLoading(true);
    try {
      const result = await fetchTokensHistory(currentPage, 10);
      if (result.success) {
        setTokensHistory(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tokens history:", error);
    } finally {
      setHistoryIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadTokensHistory();
  }, [loadTokensHistory]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t("tokensHistorySection.title")}</h1>
      <div>
        {historyIsLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : tokensHistory.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t("tokensHistorySection.noRecords")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tokensHistorySection.type")}</TableHead>
                <TableHead className="text-right">{t("tokensHistorySection.amount")}</TableHead>
                <TableHead className="text-right">{t("tokensHistorySection.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokensHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {(() => {
                      switch (item.verb) {
                        case UserTokensLogVerb.recharge:
                          return (
                            <div className="flex items-center gap-2">
                              <CoinsIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.recharge")}</span>
                            </div>
                          );
                        case UserTokensLogVerb.consume:
                          return (
                            <div className="flex items-center gap-2">
                              <HippyGhostAvatar
                                className="size-5"
                                seed={item.resourceId ?? undefined}
                              />
                              {(() => {
                                switch (item.resourceType) {
                                  case "StudyUserChat":
                                    return (
                                      <>
                                        {t("tokensHistorySection.consume.StudyUserChat")}
                                        <Link href={`/study?id=${item.resourceId}`} target="_blank">
                                          <ExternalLinkIcon className="size-4" />
                                        </Link>
                                      </>
                                    );
                                  case "InterviewProject":
                                    return (
                                      <>
                                        {t("tokensHistorySection.consume.InterviewProject")}
                                        <Link
                                          href={`/interview/projects/${item.resourceId}`}
                                          target="_blank"
                                        >
                                          <ExternalLinkIcon className="size-4" />
                                        </Link>
                                      </>
                                    );
                                  case "PersonaImport":
                                    return (
                                      <>
                                        {t("tokensHistorySection.consume.PersonaImport")}
                                        <Link
                                          href={`/personas/import/${item.resourceId}`}
                                          target="_blank"
                                        >
                                          <ExternalLinkIcon className="size-4" />
                                        </Link>
                                      </>
                                    );
                                  default:
                                    return t("tokensHistorySection.verbs.consume");
                                }
                              })()}
                            </div>
                          );
                        case UserTokensLogVerb.subscription:
                          return (
                            <div className="flex items-center gap-2">
                              <CreditCardIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.subscription")}</span>
                            </div>
                          );
                        case UserTokensLogVerb.subscriptionReset:
                          return (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.subscriptionReset")}</span>
                            </div>
                          );
                        case UserTokensLogVerb.gift:
                          return (
                            <div className="flex items-center gap-2">
                              <GiftIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.gift")}</span>
                            </div>
                          );
                        case UserTokensLogVerb.signup:
                          return (
                            <div className="flex items-center gap-2">
                              <User2Icon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.signup")}</span>
                            </div>
                          );
                        default:
                          return "";
                      }
                    })()}
                  </TableCell>
                  <TableCell
                    className={cn("text-right", {
                      "text-green-500": item.value > 0,
                      "text-red-500": item.value < 0,
                    })}
                  >
                    {item.value > 0 ? "+" : item.value < 0 ? "-" : ""}
                    {(item.value < 0 ? -item.value : item.value).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{formatDate(item.updatedAt, locale)}</TableCell>
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
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
