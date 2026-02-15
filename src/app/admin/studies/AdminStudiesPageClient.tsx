"use client";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { AnalystKind } from "@/app/(study)/context/types";
import { PaginationInfo } from "@/app/admin/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
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
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCcwIcon,
  SearchIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchBriefChatMessages, fetchStudies, generateChatTitleAction } from "./actions";

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
} as const;

export type AdminStudiesSearchParams = {
  page: number;
  search: string;
  kind: AnalystKind | "all";
};

export function AdminStudiesPageClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [studyUserChats, setStudyUserChats] = useState<
    ExtractServerActionData<typeof fetchStudies>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefMessages, setBriefMessages] = useState<TMessageWithPlainTextTool[]>([]);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery, kind: selectedKind },
    setParam,
    setParams,
  } = useListQueryParams<AdminStudiesSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchStudies(currentPage, searchQuery, 12, selectedKind);
    if (!result.success) {
      setError(result.message);
    } else {
      setStudyUserChats(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, selectedKind]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/studies/reports");
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

  const handleGenerateChatTitle = useCallback(
    async (studyUserChat: (typeof studyUserChats)[number]) => {
      const result = await generateChatTitleAction(studyUserChat.id);
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

  const toggleTopicExpansion = (studyUserChatId: number) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studyUserChatId)) {
        newSet.delete(studyUserChatId);
      } else {
        newSet.add(studyUserChatId);
      }
      return newSet;
    });
  };

  const toggleSummaryExpansion = (studyUserChatId: number) => {
    setExpandedSummaries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studyUserChatId)) {
        newSet.delete(studyUserChatId);
      } else {
        newSet.add(studyUserChatId);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setParams({ search: "", kind: "all", page: 1 });
  };

  const handleShowBrief = useCallback(async (studyUserChat: (typeof studyUserChats)[number]) => {
    const userChatContext = studyUserChat.context;
    const briefUserChatToken = userChatContext?.briefUserChatToken;

    if (!briefUserChatToken) return;

    setLoadingBrief(true);
    setBriefDialogOpen(true);

    const result = await fetchBriefChatMessages(briefUserChatToken);
    if (result.success) {
      setBriefMessages(result.data as TMessageWithPlainTextTool[]);
    } else {
      setBriefMessages([]);
    }
    setLoadingBrief(false);
  }, []);

  const renderBriefConversation = (messages: TMessageWithPlainTextTool[]) => {
    return (
      <div className="h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/30">
          {messages.map((message) => (
            <div
              key={message.id}
              className="border-b border-muted-foreground/10 last:border-b-0 pb-3 last:pb-0"
            >
              <ChatMessage
                nickname={message.role}
                message={message}
                renderToolUIPart={() => <></>}
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

  const hasActiveFilters = searchQuery || selectedKind !== "all";

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
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Studies Grid */}
      <div className="mb-4">
        <h2 className="mb-4 text-xl font-semibold">Studies</h2>
        {studyUserChats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {hasActiveFilters ? "No studies found matching your filters" : "No studies found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studyUserChats.map((studyUserChat) => (
              <Card key={studyUserChat.id}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 w-full overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="leading-normal line-clamp-2 font-semibold">
                        {studyUserChat.title || "Untitled Study"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {studyUserChat.context.briefUserChatToken ? (
                        <div className="relative m-1">
                          <Button
                            onClick={() => handleShowBrief(studyUserChat)}
                            className="p-0 has-[>svg]:p-0 size-8 hover:bg-blue-50 rounded-md bg-blue-100 border border-blue-300"
                          >
                            <FileText className="h-5 w-5 text-blue-700" />
                          </Button>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      ) : null}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleGenerateChatTitle(studyUserChat)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="re-generate chat title"
                        >
                          <RefreshCcwIcon className="size-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription></CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Topic Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                      <button
                        onClick={() => toggleTopicExpansion(studyUserChat.id)}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedTopics.has(studyUserChat.id) ? (
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
                        expandedTopics.has(studyUserChat.id)
                          ? "whitespace-pre-wrap"
                          : "line-clamp-2"
                      }`}
                    >
                      {studyUserChat.context.studyTopic}
                    </p>
                  </div>

                  {/* Summary Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">StudyLog:</span>
                      <button
                        onClick={() => toggleSummaryExpansion(studyUserChat.id)}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedSummaries.has(studyUserChat.id) ? (
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
                        expandedSummaries.has(studyUserChat.id)
                          ? "whitespace-pre-wrap"
                          : "line-clamp-3"
                      }`}
                    >
                      {studyUserChat.context.studyLog || "No study log available"}
                    </p>
                  </div>

                  {/* Feedback Stats */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-700">User Feedback</div>
                    {(() => {
                      const feedback = studyUserChat.extra.feedback;
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
                      <span className="text-xs">User:</span> {studyUserChat.user.email || "N/A"}
                    </p>
                    <p>
                      <span className="text-xs">Token:</span> {studyUserChat.token || "N/A"}
                    </p>
                    {(() => {
                      const extra = studyUserChat.extra;
                      return (
                        <p>
                          <span className="text-xs">Created:</span>{" "}
                          {formatDate(studyUserChat.createdAt, locale)}
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
                        studyUserChat.context.analystKind === "testing"
                          ? "bg-blue-100 text-blue-800"
                          : studyUserChat.context.analystKind === "planning"
                            ? "bg-green-100 text-green-800"
                            : studyUserChat.context.analystKind === "insights"
                              ? "bg-purple-100 text-purple-800"
                              : studyUserChat.context.analystKind === "creation"
                                ? "bg-orange-100 text-orange-800"
                                : studyUserChat.context.analystKind === "productRnD"
                                  ? "bg-cyan-100 text-cyan-800"
                                  : studyUserChat.context.analystKind === "misc"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {studyUserChat.context.analystKind || "N/A"}
                    </span>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/study/${studyUserChat.token}/share?replay=1`} target="_blank">
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
