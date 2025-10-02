"use client";
import PodcastsListPanel from "@/app/(study)/study/components/PodcastsListPanel";
import ReportsListPanel from "@/app/(study)/study/components/ReportsListPanel";
import { PaginationInfo } from "@/app/admin/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDate } from "@/lib/utils";
import { Analyst, UserChatExtra } from "@/prisma/client";
import { AnalystKind } from "@/prisma/types";
import { UIMessage } from "ai";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FileTextIcon,
  MicIcon,
  PlusIcon,
  RefreshCcwIcon,
  SearchIcon,
  Star,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAnalysts,
  fetchBriefChatMessages,
  generateChatTitleAction,
  generatePodcastActionAdmin,
  toggleFeaturedStatus,
} from "./actions";

type AnalystWithFeature = ExtractServerActionData<typeof fetchAnalysts>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
  kind: {
    defaultValue: "all" as AnalystKind | "all",
    serialize: (value: AnalystKind | "all") => value,
    deserialize: (value: string | null) => {
      if (!value) return "all" as AnalystKind | "all";
      return value as AnalystKind | "all";
    },
  },
  featured: createParamConfig.boolean(false),
} as const;

export type FeaturedStudiesSearchParams = {
  page: number;
  search: string;
  kind: AnalystKind | "all";
  featured: boolean;
};

interface FeaturedStudiesPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function FeaturedStudiesPageClient({ initialSearchParams }: FeaturedStudiesPageClientProps) {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [analysts, setAnalysts] = useState<AnalystWithFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefMessages, setBriefMessages] = useState<UIMessage[]>([]);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery, kind: selectedKind, featured: featuredOnly },
    setParam,
    setParams,
  } = useListQueryParams<FeaturedStudiesSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  // Helper function to format counts with generating status
  const formatCountWithStatus = (
    items: { generatedAt: Date | null }[],
    type: "reports" | "podcasts",
  ) => {
    const all = items.length;
    const generating = items.filter((item) => item.generatedAt === null).length;
    let text = "";
    text += `${all} ${type}`;
    if (generating > 0) {
      if (all > 0) text += " ";
      text += `(${generating} generating)`;
    }
    return text;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const analystsResult = await fetchAnalysts(
      currentPage,
      searchQuery,
      12,
      selectedKind,
      featuredOnly,
    );

    if (!analystsResult.success) {
      setError(analystsResult.message);
    } else {
      setAnalysts(analystsResult.data);
      if (analystsResult.pagination) setPagination(analystsResult.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, selectedKind, featuredOnly]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/featured-studies");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  const handleToggleFeatured = useCallback(
    async (analyst: Analyst) => {
      const result = await toggleFeaturedStatus(analyst);
      if (!result.success) {
        setError(result.message);
      } else {
        await fetchData();
      }
    },
    [fetchData],
  );

  const handleGenerateChatTitle = useCallback(
    async (analyst: Analyst) => {
      if (!analyst.studyUserChatId) return;
      const result = await generateChatTitleAction(analyst.studyUserChatId);
      if (!result.success) {
        setError(result.message);
      } else {
        await fetchData();
      }
    },
    [fetchData],
  );

  const handleKindChange = (value: string) => {
    setParams({ kind: value as AnalystKind | "all", page: 1 });
  };

  const toggleTopicExpansion = (analystId: number) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(analystId)) {
        newSet.delete(analystId);
      } else {
        newSet.add(analystId);
      }
      return newSet;
    });
  };

  const toggleSummaryExpansion = (analystId: number) => {
    setExpandedSummaries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(analystId)) {
        newSet.delete(analystId);
      } else {
        newSet.add(analystId);
      }
      return newSet;
    });
  };

  const handleFeaturedToggle = (checked: boolean) => {
    setParams({ featured: checked, page: 1 });
  };

  const clearAllFilters = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setParams({ search: "", kind: "all", featured: false, page: 1 });
  };

  const handleGeneratePodcast = async (analyst: AnalystWithFeature) => {
    try {
      await generatePodcastActionAdmin({
        analystId: analyst.id,
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to generate podcast:", error);
    }
  };

  const handleShowBrief = async (analyst: AnalystWithFeature) => {
    const extra = analyst.studyUserChat?.extra as UserChatExtra;
    const briefUserChatId = extra?.briefUserChatId;

    if (!briefUserChatId) return;

    // Ensure briefUserChatId is a number
    const chatId =
      typeof briefUserChatId === "string" ? parseInt(briefUserChatId, 10) : briefUserChatId;
    if (isNaN(chatId)) return;

    setLoadingBrief(true);
    setBriefDialogOpen(true);

    const result = await fetchBriefChatMessages(chatId);
    if (result.success) {
      setBriefMessages(result.data);
    } else {
      setBriefMessages([]);
    }
    setLoadingBrief(false);
  };

  const renderBriefConversation = (messages: UIMessage[]) => {
    return (
      <div className="h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/30">
          {messages.map((message) => (
            <div
              key={message.id}
              className="border-b border-muted-foreground/10 last:border-b-0 pb-3 last:pb-0"
            >
              <ChatMessage
                role={message.role}
                nickname={message.role}
                content={message.content}
                parts={message.parts}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (status === "loading" || isLoading) {
    return <div className="container">Loading...</div>;
  }

  const hasActiveFilters = searchQuery || selectedKind !== "all" || featuredOnly;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Featured Studies Management</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-64">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                defaultValue={searchQuery}
                ref={inputRef}
                placeholder="Search by email, topic, or token..."
                className="pl-8"
              />
            </div>
          </div>
          <Select value={selectedKind} onValueChange={handleKindChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kinds</SelectItem>
              <SelectItem value={AnalystKind.testing}>Testing</SelectItem>
              <SelectItem value={AnalystKind.planning}>Planning</SelectItem>
              <SelectItem value={AnalystKind.insights}>Insights</SelectItem>
              <SelectItem value={AnalystKind.creation}>Creation</SelectItem>
              <SelectItem value={AnalystKind.productRnD}>Product R&D</SelectItem>
              <SelectItem value={AnalystKind.misc}>Misc</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Switch
              id="featured-only"
              checked={featuredOnly}
              onCheckedChange={handleFeaturedToggle}
            />
            <Label htmlFor="featured-only">Featured only</Label>
          </div>
          <Button type="submit">Search</Button>
        </form>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Search: {searchQuery}
              </span>
            )}
            {selectedKind !== "all" && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                Kind: {selectedKind}
              </span>
            )}
            {featuredOnly && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Featured only</span>
            )}
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Studies Grid */}
      <div className="mb-4">
        <h2 className="mb-4 text-xl font-semibold">Studies</h2>
        {analysts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {hasActiveFilters ? "No studies found matching your filters" : "No studies found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analysts.map((analyst) => (
              <Card
                key={analyst.id}
                className={analyst.featuredStudy ? "border-2 border-blue-400" : ""}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 w-full overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="leading-normal line-clamp-2 font-semibold">
                        {analyst.studyUserChat?.title || "Untitled Study"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(() => {
                        const extra = analyst.studyUserChat?.extra as UserChatExtra;
                        const briefUserChatId = extra?.briefUserChatId;
                        return briefUserChatId ? (
                          <div className="relative m-1">
                            <Button
                              onClick={() => handleShowBrief(analyst)}
                              className="p-0 has-[>svg]:p-0 size-8 hover:bg-blue-50 rounded-md bg-blue-100 border border-blue-300"
                            >
                              <FileText className="h-5 w-5 text-blue-700" />
                            </Button>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleToggleFeatured(analyst)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={analyst.featuredStudy ? "Remove from featured" : "Add to featured"}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              analyst.featuredStudy
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-400 hover:text-yellow-400"
                            } transition-colors`}
                          />
                        </button>
                        <button
                          onClick={() => handleGenerateChatTitle(analyst)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="re-generate chat title"
                        >
                          <RefreshCcwIcon className="size-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription>{analyst.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Topic Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                      <button
                        onClick={() => toggleTopicExpansion(analyst.id)}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedTopics.has(analyst.id) ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Expand
                          </>
                        )}
                      </button>
                    </div>
                    <p
                      className={`text-sm ${
                        expandedTopics.has(analyst.id) ? "whitespace-pre-wrap" : "line-clamp-2"
                      }`}
                    >
                      {analyst.topic}
                    </p>
                  </div>

                  {/* Summary Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Summary:</span>
                      <button
                        onClick={() => toggleSummaryExpansion(analyst.id)}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedSummaries.has(analyst.id) ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Expand
                          </>
                        )}
                      </button>
                    </div>
                    <p
                      className={`text-sm ${
                        expandedSummaries.has(analyst.id) ? "whitespace-pre-wrap" : "line-clamp-3"
                      }`}
                    >
                      {analyst.studySummary}
                    </p>
                  </div>

                  {/* Stats section */}
                  <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg space-y-2">
                    {(() => {
                      const reportsText = analyst.reports
                        ? formatCountWithStatus(analyst.reports, "reports")
                        : null;
                      const podcastsText = analyst.podcasts
                        ? formatCountWithStatus(analyst.podcasts, "podcasts")
                        : null;

                      return analyst.studyUserChat ? (
                        <>
                          {/* Reports row */}
                          <div className="flex items-center">
                            <ReportsListPanel
                              studyUserChatToken={analyst.studyUserChat.token}
                              download={true}
                            >
                              <div className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <FileTextIcon className="h-4 w-4" />
                                <span className="font-normal">{reportsText}</span>
                              </div>
                            </ReportsListPanel>
                          </div>

                          {/* Podcasts row with generate button */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <PodcastsListPanel studyUserChatToken={analyst.studyUserChat.token}>
                                <div className="flex items-center gap-1.5 text-sm cursor-pointer">
                                  <MicIcon className="h-4 w-4 shrink-0" />
                                  <span className="font-normal">{podcastsText}</span>
                                </div>
                              </PodcastsListPanel>
                            </div>
                            <ConfirmDialog
                              title="Generate Podcast"
                              description={`Are you sure you want to generate a podcast for "${truncateForTitle(
                                analyst.topic,
                                {
                                  maxDisplayWidth: 50,
                                  suffix: "...",
                                },
                              )}"? This will use AI tokens.`}
                              onConfirm={() => handleGeneratePodcast(analyst)}
                            >
                              <Button variant="ghost" size="sm">
                                <PlusIcon className="h-3 w-3" />
                                Generate
                              </Button>
                            </ConfirmDialog>
                          </div>

                          {/* Show message when no reports and no podcasts */}
                          {!reportsText && !podcastsText && (
                            <div className="text-sm text-muted-foreground">
                              No reports or podcasts yet
                            </div>
                          )}
                        </>
                      ) : null;
                    })()}
                  </div>

                  {/* Feedback Stats */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-700">User Feedback</div>
                    {(() => {
                      const extra = analyst.studyUserChat?.extra as UserChatExtra;
                      const feedback = extra?.feedback;
                      if (feedback?.rating) {
                        return (
                          <div className="flex items-center gap-4">
                            {feedback.rating === "useful" && (
                              <div className="flex items-center gap-1.5 text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                <ThumbsUpIcon className="h-3 w-3" />
                                <span className="text-xs font-medium">Useful</span>
                              </div>
                            )}
                            {feedback.rating === "not_useful" && (
                              <div className="flex items-center gap-1.5 text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                <ThumbsDownIcon className="h-3 w-3" />
                                <span className="text-xs font-medium">Not useful</span>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return <div className="text-xs text-gray-500 italic">No feedback yet</div>;
                      }
                    })()}
                  </div>
                  {/* Meta Information */}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="text-xs">User:</span> {analyst.user?.email || "N/A"}
                    </p>
                    <p>
                      <span className="text-xs">Token:</span>{" "}
                      {analyst.studyUserChat?.token || "N/A"}
                    </p>
                    {(() => {
                      const extra = analyst.studyUserChat?.extra as UserChatExtra;
                      return (
                        <p>
                          <span className="text-xs">Created:</span>{" "}
                          {formatDate(analyst.createdAt, locale)}
                          {extra?.geo && (
                            <span>
                              (📍{extra.geo.city},{extra.geo.country})
                            </span>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </CardContent>
                <CardFooter className="gap-2 items-center justify-between mt-auto">
                  <div className="flex items-center">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        analyst.kind === "testing"
                          ? "bg-blue-100 text-blue-800"
                          : analyst.kind === "planning"
                            ? "bg-green-100 text-green-800"
                            : analyst.kind === "insights"
                              ? "bg-purple-100 text-purple-800"
                              : analyst.kind === "creation"
                                ? "bg-orange-100 text-orange-800"
                                : analyst.kind === "productRnD"
                                  ? "bg-cyan-100 text-cyan-800"
                                  : analyst.kind === "misc"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {analyst.kind || "N/A"}
                    </span>
                  </div>
                  <Button variant="outline" asChild>
                    <Link
                      href={`/study/${analyst.studyUserChat?.token}/share?replay=1`}
                      target="_blank"
                    >
                      View Study
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Brief Chat Dialog */}
      <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen}>
        <DialogContent className="max-w-7xl sm:max-w-5xl w-[90vw] h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Brief Chat</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {loadingBrief ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-muted-foreground">Loading brief conversation...</div>
              </div>
            ) : briefMessages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-muted-foreground">No messages found in brief conversation</div>
              </div>
            ) : (
              renderBriefConversation(briefMessages)
            )}
          </div>
        </DialogContent>
      </Dialog>

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
  );
}
