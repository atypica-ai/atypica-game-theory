"use client";
import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { AnalystPodcastExtra } from "@/prisma/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  ChevronDown,
  ChevronUp,
  ExternalLinkIcon,
  FlaskConicalIcon,
  PencilIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAnalystPodcastsAction,
  generatePodcastTitleAction,
  updatePodcastTitleAction,
} from "./actions";

type AnalystPodcastWithAnalyst = ExtractServerActionData<typeof fetchAnalystPodcastsAction>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
} as const;

export type AnalystPodcastsSearchParams = {
  page: number;
  search: string;
};

interface AnalystPodcastsPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function AnalystPodcastsPageClient({ initialSearchParams }: AnalystPodcastsPageClientProps) {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [analystPodcasts, setAnalystPodcasts] = useState<AnalystPodcastWithAnalyst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [generatingTitleId, setGeneratingTitleId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<AnalystPodcastsSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchAnalystPodcastsAction(currentPage, 12, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setAnalystPodcasts(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/studies/podcasts");
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

  const toggleTopicExpansion = (podcastId: number) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(podcastId)) {
        newSet.delete(podcastId);
      } else {
        newSet.add(podcastId);
      }
      return newSet;
    });
  };

  const toggleScriptExpansion = (podcastId: number) => {
    setExpandedScripts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(podcastId)) {
        newSet.delete(podcastId);
      } else {
        newSet.add(podcastId);
      }
      return newSet;
    });
  };

  const startEditingTitle = (podcastId: number, currentTitle: string) => {
    setEditingTitleId(podcastId);
    setEditingTitleValue(currentTitle);
  };

  const cancelEditingTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const saveTitle = async (podcastId: number) => {
    setSavingTitle(true);
    try {
      const result = await updatePodcastTitleAction(podcastId, editingTitleValue);
      if (result.success) {
        // Update local state
        setAnalystPodcasts((prev) =>
          prev.map((podcast) => {
            if (podcast.id === podcastId) {
              const extra = (podcast.extra || {}) as AnalystPodcastExtra;
              return {
                ...podcast,
                extra: {
                  ...extra,
                  metadata: {
                    ...extra.metadata,
                    title: editingTitleValue,
                  },
                } as AnalystPodcastExtra,
              };
            }
            return podcast;
          }),
        );
        setEditingTitleId(null);
        setEditingTitleValue("");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingTitle(false);
    }
  };

  const generateTitle = async (podcastId: number) => {
    setGeneratingTitleId(podcastId);
    try {
      const result = await generatePodcastTitleAction(podcastId);
      if (result.success) {
        // Update local state with generated title
        setAnalystPodcasts((prev) =>
          prev.map((podcast) => {
            if (podcast.id === podcastId) {
              const extra = (podcast.extra || {}) as AnalystPodcastExtra;
              return {
                ...podcast,
                extra: {
                  ...extra,
                  metadata: {
                    ...extra.metadata,
                    title: result.data,
                  },
                } as AnalystPodcastExtra,
              };
            }
            return podcast;
          }),
        );
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingTitleId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analyst Podcasts Management</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/studies/podcasts/test" className="flex items-center gap-2">
            <FlaskConicalIcon className="h-4 w-4" />
            Podcast Test
          </Link>
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            defaultValue={searchQuery}
            ref={inputRef}
            placeholder="Search by token, topic, or email..."
            className="pl-8"
          />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = "";
              }
              setParams({ search: "", page: 1 });
            }}
          >
            Clear Search
          </Button>
        )}
      </form>

      <div className="mb-4">
        {searchQuery && (
          <div className="mb-4 text-sm text-muted-foreground">
            Filtering by token, topic, or email: <span className="font-medium">{searchQuery}</span>
          </div>
        )}
        {analystPodcasts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {searchQuery
                ? `No analyst podcasts found for query "${searchQuery}"`
                : "No analyst podcasts found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analystPodcasts.map((podcast) => {
              const extra = (podcast.extra || {}) as AnalystPodcastExtra;
              const podcastTitle = extra.metadata?.title || "";
              const kindInfo = extra.kindDetermination;
              const isEditingThisTitle = editingTitleId === podcast.id;

              return (
                <Card key={podcast.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between w-full overflow-hidden gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditingThisTitle ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingTitleValue}
                              onChange={(e) => setEditingTitleValue(e.target.value)}
                              className="text-sm"
                              placeholder="Enter title..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveTitle(podcast.id);
                                } else if (e.key === "Escape") {
                                  cancelEditingTitle();
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="leading-normal font-semibold flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-normal">
                              Title:
                            </span>
                            <span className={podcastTitle ? "" : "text-muted-foreground italic"}>
                              {podcastTitle || "not set"}
                            </span>
                          </div>
                        )}
                      </div>
                      {isEditingThisTitle ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => saveTitle(podcast.id)}
                            disabled={savingTitle}
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={cancelEditingTitle}
                            disabled={savingTitle}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => generateTitle(podcast.id)}
                                  disabled={generatingTitleId === podcast.id || !podcast.script}
                                >
                                  <SparklesIcon className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover text-popover-foreground border rounded px-2 py-1 text-xs">
                                Generate title with AI
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => startEditingTitle(podcast.id, podcastTitle)}
                          >
                            <PencilIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Topic Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                        <button
                          onClick={() => toggleTopicExpansion(podcast.id)}
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedTopics.has(podcast.id) ? (
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
                          expandedTopics.has(podcast.id) ? "whitespace-pre-wrap" : "line-clamp-2"
                        }`}
                      >
                        {podcast.analyst.topic}
                      </p>
                    </div>

                    {/* Script Section */}
                    {podcast.script && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">Script:</span>
                          <button
                            onClick={() => toggleScriptExpansion(podcast.id)}
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                          >
                            {expandedScripts.has(podcast.id) ? (
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
                            expandedScripts.has(podcast.id) ? "whitespace-pre-wrap" : "line-clamp-3"
                          }`}
                        >
                          {podcast.script}
                        </p>
                      </div>
                    )}

                    {/* Kind Determination */}
                    {kindInfo && (
                      <div className="mb-4">
                        <span className="text-xs font-medium text-muted-foreground">Kind: </span>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-sm font-semibold">{kindInfo.kind}</span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              className="max-w-md bg-background text-xs p-3 shadow-md rounded-md"
                            >
                              {kindInfo.reason}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    {/* Meta Information */}
                    <div className="space-y-1 text-sm text-muted-foreground border-t pt-3">
                      <p>
                        <span className="text-xs">User:</span>{" "}
                        {podcast.analyst.user?.email || "N/A"}
                      </p>
                      <p>
                        <span className="text-xs">Token:</span>{" "}
                        <span className="font-mono">{podcast.token}</span>
                      </p>
                      <p>
                        <span className="text-xs">Generated:</span>{" "}
                        {podcast.generatedAt
                          ? formatDate(podcast.generatedAt, locale)
                          : "Not generated"}
                      </p>
                      <p>
                        <span className="text-xs">Created:</span>{" "}
                        {formatDate(podcast.createdAt, locale)}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2 items-center justify-between flex-wrap mt-auto">
                    <div className="flex items-center">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          podcast.analyst.kind === "testing"
                            ? "bg-blue-100 text-blue-800"
                            : podcast.analyst.kind === "planning"
                              ? "bg-green-100 text-green-800"
                              : podcast.analyst.kind === "insights"
                                ? "bg-purple-100 text-purple-800"
                                : podcast.analyst.kind === "creation"
                                  ? "bg-orange-100 text-orange-800"
                                  : podcast.analyst.kind === "misc"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {podcast.analyst.kind || "N/A"}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/artifacts/podcast/${podcast.token}/share`}
                        target="_blank"
                        className="flex items-center gap-1"
                      >
                        <ExternalLinkIcon className="h-3 w-3" />
                        Listen
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setParam("page", page)}
          />
          {pagination.totalCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Total: {pagination.totalCount.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
