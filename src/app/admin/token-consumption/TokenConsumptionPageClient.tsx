"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { ChevronDown, ChevronRight, PlayIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { ChatTokenConsumptionData, fetchTokenConsumption } from "./actions";

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
} as const;

export type TokenConsumptionSearchParams = {
  page: number;
  search: string;
};

interface TokenConsumptionPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function TokenConsumptionPageClient({
  initialSearchParams,
}: TokenConsumptionPageClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<ChatTokenConsumptionData[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedChats, setExpandedChats] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Use query params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<TokenConsumptionSearchParams>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
    },
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchTokenConsumption(currentPage, 50, searchQuery);
      if (!result.success) {
        setError(result.message || "Failed to fetch token consumption data");
      } else {
        setTokenData(result.data || []);
        setPagination(result.pagination || null);
      }
    } catch (err) {
      console.error("Error fetching token consumption data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch token consumption data");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  // Initial data fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/token-consumption");
    }
  }, [status, fetchData, router]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  const handlePageChange = (page: number) => {
    setParam("page", page);
  };

  const toggleChatExpansion = (chatId: number) => {
    setExpandedChats((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  // Calculate token reduction percentage based on reduced tokens and total tokens
  const getReductionPercentage = (reducedTokens: number, totalTokens: number) => {
    if (totalTokens === 0 || reducedTokens === 0) return null;
    const reduction = (reducedTokens / (totalTokens + reducedTokens)) * 100;
    return reduction > 0 ? reduction.toFixed(1) + "%" : null;
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  // Helper to get token level color based on thresholds
  const getTokenLevelClass = (tokens: number) => {
    if (tokens >= 950000) return "text-red-600 dark:text-red-400";
    if (tokens >= 450000) return "text-amber-600 dark:text-amber-400";
    return "text-foreground";
  };

  // Helper to get user display name
  const getUserDisplayName = (chat: ChatTokenConsumptionData) => {
    // return chat.userName || chat.userEmail || `User #${chat.userId}`;
    return chat.userEmail || `User #${chat.userId}`;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Token Consumption</h1>
      <div className="mb-6 space-y-4">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                defaultValue={searchQuery}
                ref={inputRef}
                placeholder="Search by email or token"
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
        </div>
        <div className="rounded-md border">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[5%]"></TableHead>
                <TableHead className="w-[45%]">Chat</TableHead>
                <TableHead className="text-right font-semibold w-[50%]">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : tokenData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No token consumption data found
                  </TableCell>
                </TableRow>
              ) : (
                tokenData.map((chat) => {
                  const isExpanded = !!expandedChats[chat.userChatId];
                  return (
                    <React.Fragment key={`chat-group-${chat.userChatId}`}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleChatExpansion(chat.userChatId)}
                      >
                        <TableCell className="py-2 pl-4 pr-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {chat.title || `Chat #${chat.userChatId}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/study/${chat.token}/share?replay=1`}
                                target="_blank"
                                className="text-xs text-muted-foreground font-mono hover:text-primary hover:underline truncate max-w-[180px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <PlayIcon className="size-2.5 inline" />
                                {chat.token}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {getUserDisplayName(chat)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(chat.createdAt, locale)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                          <div className="flex flex-col items-end">
                            <div className="inline-flex items-baseline justify-end">
                              <span
                                className={`font-semibold text-base w-[70px] text-right ${getTokenLevelClass(chat.totalTokens)}`}
                              >
                                {formatTokensNumber(chat.totalTokens)}
                              </span>
                            </div>
                            {chat.totalReducedTokens > 0 && (
                              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <span>Saved: {formatTokensNumber(chat.totalReducedTokens)}</span>
                                <span className="px-1 py-0.5 bg-green-500/10 rounded">
                                  {getReductionPercentage(
                                    chat.totalReducedTokens,
                                    chat.totalTokens,
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`detail-${chat.userChatId}`} className="bg-muted/20">
                          <TableCell colSpan={3} className="py-0">
                            <div className="px-4 py-2 animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 gap-1">
                                {chat.tokenSources.map((source, idx) => {
                                  const sourceReduction = getReductionPercentage(
                                    source.reducedTokens,
                                    source.tokens,
                                  );
                                  return (
                                    <div
                                      key={`${chat.userChatId}-source-${idx}`}
                                      className="flex items-center py-1 px-2 rounded-sm hover:bg-muted/40"
                                    >
                                      <div className="flex-grow font-medium text-sm max-w-[150px] truncate">
                                        {source.reportedBy}
                                      </div>

                                      <div className="flex items-center ml-auto gap-2">
                                        {sourceReduction && source.reducedTokens > 0 && (
                                          <div className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded font-medium min-w-[45px] text-center">
                                            -{sourceReduction}
                                          </div>
                                        )}
                                        {source.reducedTokens > 0 && (
                                          <div className="text-muted-foreground text-xs inline-flex items-center">
                                            <span className="opacity-70">saved</span>
                                            <span className="ml-1 font-medium">
                                              {formatTokensNumber(source.reducedTokens)}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center pl-2">
                                        <span
                                          className={`font-semibold text-sm w-[60px] text-right ${getTokenLevelClass(source.tokens)}`}
                                        >
                                          {formatTokensNumber(source.tokens)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
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
