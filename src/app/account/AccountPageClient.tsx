"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SubscriptionPlan, UserTokensLog, UserTokensLogVerb } from "@prisma/client";
import {
  CalendarIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  CreditCardIcon,
  GiftIcon,
  User2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AddTokensDialog } from "../payment/components/AddTokensDialog";
import { SubscriptionDialog } from "../payment/components/SubscriptionDialog";
import { fetchTokensHistory } from "./actions";

export function AccountPageClient({
  userTokens,
  subscription,
}: {
  userTokens: {
    balance: number;
  } | null;
  subscription: {
    id: number;
    plan: SubscriptionPlan;
    endsAt: Date | null;
    startsAt: Date;
  } | null;
}) {
  const t = useTranslations("AccountPage");
  const locale = useLocale();
  const [isAddTokensOpen, setIsAddTokensOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [tokensHistory, setTokensHistory] = useState<UserTokensLog[]>([]);
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
    }
    loadTokensHistory();
  }, [currentPage]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin py-6">
      <div className="container max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Subscription Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCardIcon className="mr-2 h-5 w-5" />
                {t("subscriptionSection.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {t("subscriptionSection.currentPlan")}
                  </div>
                  <div className="font-medium">
                    {subscription
                      ? `${t("subscriptionSection.proPlan")}` //(${subscription.plan})
                      : t("subscriptionSection.notSubscribed")}
                  </div>
                </div>

                {subscription && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {t("subscriptionSection.status")}
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span>{t("subscriptionSection.active")}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {t("subscriptionSection.expires")}
                      </div>
                      <div className="font-medium flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {subscription.endsAt
                          ? formatDate(subscription.endsAt, locale)
                          : t("subscriptionSection.neverExpires")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full mt-4" onClick={() => setIsSubscribeOpen(true)}>
                {subscription
                  ? t("subscriptionSection.renewalDate")
                  : t("subscriptionSection.upgrade")}
              </Button>
            </CardFooter>
          </Card>

          {/* Tokens Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CircleDollarSignIcon className="mr-2 h-5 w-5" />
                {t("tokensSection.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">{t("tokensSection.balance")}</div>
                  <div className="text-2xl font-bold">
                    {(userTokens?.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full mt-4" onClick={() => setIsAddTokensOpen(true)}>
                {t("tokensSection.purchase")}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Transactions History */}
        <Card>
          <CardHeader>
            <CardTitle>{t("historySection.title")}</CardTitle>
            <CardDescription>Recent token transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {historyIsLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : tokensHistory.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("historySection.noRecords")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("historySection.type")}</TableHead>
                    <TableHead className="text-right">{t("historySection.amount")}</TableHead>
                    <TableHead className="text-right">{t("historySection.date")}</TableHead>
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
                                <div className="flex items-center gap-1">
                                  <span>{t("historySection.verbs.recharge")}</span>
                                  <CoinsIcon className="size-4" />
                                </div>
                              );
                            case UserTokensLogVerb.consume:
                              return (
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    switch (item.resourceType) {
                                      case "StudyUserChat":
                                        return (
                                          <span>{t("historySection.consume.StudyUserChat")}</span>
                                        );
                                      case "InterviewProject":
                                        return (
                                          <span>
                                            {t("historySection.consume.InterviewProject")}
                                          </span>
                                        );
                                      default:
                                        return <span>{t("historySection.verbs.consume")}</span>;
                                    }
                                  })()}
                                  <HippyGhostAvatar
                                    className="size-5"
                                    seed={item.resourceId ?? undefined}
                                  />
                                </div>
                              );
                            case UserTokensLogVerb.subscription:
                              return (
                                <div className="flex items-center gap-1">
                                  <span>{t("historySection.verbs.subscription")}</span>
                                  <CreditCardIcon className="size-4" />
                                </div>
                              );
                            case UserTokensLogVerb.gift:
                              return (
                                <div className="flex items-center gap-1">
                                  <span>{t("historySection.verbs.gift")}</span>
                                  <GiftIcon className="size-4" />
                                </div>
                              );
                            case UserTokensLogVerb.signup:
                              return (
                                <div className="flex items-center gap-1">
                                  <span>{t("historySection.verbs.signup")}</span>
                                  <User2Icon className="size-4" />
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
                        {Math.abs(item.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDate(item.createdAt, locale)}
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
      </div>
      {/* Dialogs */}
      <AddTokensDialog open={isAddTokensOpen} onOpenChange={setIsAddTokensOpen} />
      <SubscriptionDialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen} />
    </div>
  );
}
