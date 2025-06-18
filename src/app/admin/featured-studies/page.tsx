"use client";
import { AnalystKind } from "@/app/(public)/featured-studies/data";
import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { Analyst, UserChatExtra } from "@/prisma/client";
import {
  ChevronDown,
  ChevronUp,
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
import { fetchAnalysts, toggleFeaturedStatus } from "./actions";

type AnalystWithFeature = ExtractServerActionData<typeof fetchAnalysts>[number];

export default function FeaturedStudiesPage() {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [analysts, setAnalysts] = useState<AnalystWithFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<AnalystKind | "all">("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");
      const kindParam = url.searchParams.get("kind");
      const featuredParam = url.searchParams.get("featured");

      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
      if (kindParam) {
        setSelectedKind(kindParam as AnalystKind | "all");
      }
      if (featuredParam === "true") {
        setFeaturedOnly(true);
      }
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());

    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }

    if (selectedKind !== "all") {
      url.searchParams.set("kind", selectedKind);
    } else {
      url.searchParams.delete("kind");
    }

    if (featuredOnly) {
      url.searchParams.set("featured", "true");
    } else {
      url.searchParams.delete("featured");
    }

    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery, selectedKind, featuredOnly]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

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

  const handleToggleFeatured = async (analyst: Analyst) => {
    const result = await toggleFeaturedStatus(analyst);
    if (!result.success) {
      setError(result.message);
    } else {
      await fetchData();
    }
  };
  const handleKindChange = (value: string) => {
    setSelectedKind(value as AnalystKind | "all");
    setCurrentPage(1);
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
    setFeaturedOnly(checked);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearchQuery("");
    setSelectedKind("all");
    setFeaturedOnly(false);
    setCurrentPage(1);
  };

  if (status === "loading" || isLoading) {
    return <div className="container mt-8">Loading...</div>;
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
                  <CardTitle className="flex items-center justify-between w-full overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="leading-normal truncate font-semibold">
                        <span className="text-xs text-muted-foreground font-normal">Brief: </span>
                        {analyst.studyUserChat?.title || "Untitled Study"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFeatured(analyst)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors ml-2"
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
                  </CardTitle>
                  <CardDescription>
                    <span className="text-xs text-muted-foreground">Role: </span>
                    {analyst.role}
                  </CardDescription>
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
                    <p>
                      <span className="text-xs">Created:</span>{" "}
                      {formatDate(analyst.createdAt, locale)}
                    </p>
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

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
