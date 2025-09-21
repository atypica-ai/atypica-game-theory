"use client";
import { fetchTokensHistory, fetchTokensHistoryAsTeamOwner } from "@/app/account/actions";
import { getUserTeamStatusAction } from "@/app/team/actions";
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
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { TokensLog, TokensLogVerb } from "@/prisma/client";
import { TokensLogResourceType } from "@/tokens/types";
import {
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GiftIcon,
  User2Icon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface TokensHistoryProps {
  initialSearchParams: Record<string, string | number>;
}

export function TokensHistory({ initialSearchParams }: TokensHistoryProps) {
  const { data: session } = useSession();
  const t = useTranslations("AccountPage");
  const locale = useLocale();
  const [tokensHistory, setTokensHistory] = useState<(TokensLog & { consumedBy?: string })[]>([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);

  // Use query params hook for URL synchronization
  type TokensHistorySearchParams = {
    page: number;
  };

  const {
    values: { page: currentPage },
    setParam,
  } = useListQueryParams<TokensHistorySearchParams>({
    params: {
      page: createParamConfig.number(1),
    },
    initialValues: initialSearchParams,
  });

  const [teamStatus, setTeamStatus] = useState<ExtractServerActionData<
    typeof getUserTeamStatusAction
  > | null>(null);

  // 加载用户团队状态
  useEffect(() => {
    if (session?.user?.id) {
      getUserTeamStatusAction().then((result) => {
        if (result.success) {
          setTeamStatus(result.data);
        }
      });
    }
  }, [session?.user?.id]);

  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadTokensHistory = useCallback(async () => {
    if (!teamStatus) {
      // 等 teamStatus 加载好了再获取 tokens
      return;
    }
    setHistoryIsLoading(true);
    try {
      console.log(teamStatus, "start");
      const result =
        teamStatus.teamRole === "owner"
          ? await fetchTokensHistoryAsTeamOwner(currentPage, 10)
          : await fetchTokensHistory(currentPage, 10);
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
  }, [currentPage, teamStatus]);

  // 当页面或团队状态变化时加载数据
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
                {teamStatus?.teamRole === "owner" && (
                  <TableHead className="text-right">
                    {t("tokensHistorySection.consumedBy")}
                  </TableHead>
                )}
                <TableHead className="text-right">{t("tokensHistorySection.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokensHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {(() => {
                      switch (item.verb) {
                        case TokensLogVerb.recharge:
                          return (
                            <div className="flex items-center gap-2">
                              <CoinsIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.recharge")}</span>
                            </div>
                          );
                        case TokensLogVerb.consume:
                          return (
                            <div className="flex items-center gap-2">
                              <HippyGhostAvatar
                                className="size-5"
                                seed={item.resourceId ?? undefined}
                              />
                              {(() => {
                                switch (item.resourceType) {
                                  case TokensLogResourceType.StudyUserChat:
                                    return (
                                      <>
                                        {t("tokensHistorySection.consume.StudyUserChat")}
                                        <Link href={`/study?id=${item.resourceId}`} target="_blank">
                                          <ExternalLinkIcon className="size-4" />
                                        </Link>
                                      </>
                                    );
                                  case TokensLogResourceType.InterviewProject:
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
                                  case TokensLogResourceType.PersonaImport:
                                    return (
                                      <>
                                        {t("tokensHistorySection.consume.PersonaImport")}
                                        <Link
                                          href={`/persona/import/${item.resourceId}`}
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
                        case TokensLogVerb.subscription:
                          return (
                            <div className="flex items-center gap-2">
                              <CreditCardIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.subscription")}</span>
                            </div>
                          );
                        case TokensLogVerb.subscriptionReset:
                          return (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.subscriptionReset")}</span>
                            </div>
                          );
                        case TokensLogVerb.gift:
                          return (
                            <div className="flex items-center gap-2">
                              <GiftIcon className="size-4" />
                              <span>{t("tokensHistorySection.verbs.gift")}</span>
                            </div>
                          );
                        case TokensLogVerb.signup:
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
                  {teamStatus?.teamRole === "owner" && (
                    <TableCell className="text-right">{item.consumedBy}</TableCell>
                  )}
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
              onPageChange={(page) => setParam("page", page)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
