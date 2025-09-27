"use client";
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
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate, proxiedImageLoader } from "@/lib/utils";
import { CameraIcon, ChevronDown, ChevronUp, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { adminGenerateScreenshotAction, fetchAnalystReportsAction } from "./actions";

type AnalystReportWithAnalyst = ExtractServerActionData<typeof fetchAnalystReportsAction>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
  featured: createParamConfig.boolean(false),
} as const;

export type AnalystReportsSearchParams = {
  page: number;
  search: string;
  featured: boolean;
};

interface AnalystReportsPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function AnalystReportsPageClient({ initialSearchParams }: AnalystReportsPageClientProps) {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [analystReports, setAnalystReports] = useState<AnalystReportWithAnalyst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [generatingScreenshots, setGeneratingScreenshots] = useState<Set<number>>(new Set());
  const [expandedInstructions, setExpandedInstructions] = useState<Set<number>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery, featured: featuredOnly },
    setParam,
    setParams,
  } = useListQueryParams<AnalystReportsSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchAnalystReportsAction(currentPage, 12, searchQuery, featuredOnly);
    if (!result.success) {
      setError(result.message);
    } else {
      setAnalystReports(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, featuredOnly]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/analyst-reports");
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

  const handleGenerateScreenshot = async (reportId: number) => {
    setGeneratingScreenshots((prev) => new Set(prev).add(reportId));
    try {
      const result = await adminGenerateScreenshotAction(reportId);
      if (!result.success) {
        setError(result.message);
      } else {
        await fetchData(); // Refresh the list
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingScreenshots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const toggleInstructionExpansion = (reportId: number) => {
    setExpandedInstructions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const toggleTopicExpansion = (reportId: number) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  if (status === "loading" || isLoading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Analyst Reports Management</h1>

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
        {analystReports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {searchQuery
                ? `No analyst reports found for query "${searchQuery}"`
                : "No analyst reports found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analystReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between w-full overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="leading-normal truncate font-semibold">
                        <span className="text-xs text-muted-foreground font-normal">Brief: </span>
                        {report.analyst.brief || "Untitled Report"}
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    <span className="text-xs text-muted-foreground">Role: </span>
                    {report.analyst.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Cover Image */}
                  {report.coverUrl ? (
                    <div className="relative w-full aspect-video overflow-hidden rounded-lg mb-4">
                      <Image
                        loader={proxiedImageLoader} // mainland 加载 us s3 的资源需要 proxy
                        src={report.coverUrl}
                        alt={`Cover for ${report.analyst.topic}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateScreenshot(report.id)}
                        disabled={generatingScreenshots.has(report.id)}
                        className="flex items-center gap-1"
                      >
                        <CameraIcon className="h-3 w-3" />
                        {generatingScreenshots.has(report.id) ? "Generating..." : "Generate Cover"}
                      </Button>
                    </div>
                  )}

                  {/* Topic Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                      <button
                        onClick={() => toggleTopicExpansion(report.id)}
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedTopics.has(report.id) ? (
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
                        expandedTopics.has(report.id) ? "whitespace-pre-wrap" : "line-clamp-2"
                      }`}
                    >
                      {report.analyst.topic}
                    </p>
                  </div>

                  {/* Instruction Section */}
                  {report.instruction && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Instruction:
                        </span>
                        <button
                          onClick={() => toggleInstructionExpansion(report.id)}
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedInstructions.has(report.id) ? (
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
                          expandedInstructions.has(report.id)
                            ? "whitespace-pre-wrap"
                            : "line-clamp-3"
                        }`}
                      >
                        {report.instruction}
                      </p>
                    </div>
                  )}

                  {/* Meta Information */}
                  <div className="space-y-1 text-sm text-muted-foreground border-t pt-3">
                    <p>
                      <span className="text-xs">User:</span> {report.analyst.user?.email || "N/A"}
                    </p>
                    <p>
                      <span className="text-xs">Token:</span>{" "}
                      <span className="font-mono">{report.token}</span>
                    </p>
                    <p>
                      <span className="text-xs">Generated:</span>{" "}
                      {report.generatedAt
                        ? formatDate(report.generatedAt, locale)
                        : "Not generated"}
                    </p>
                    <p>
                      <span className="text-xs">Created:</span>{" "}
                      {formatDate(report.createdAt, locale)}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 items-center justify-between flex-wrap mt-auto">
                  <div className="flex items-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        report.analyst.kind === "testing"
                          ? "bg-blue-100 text-blue-800"
                          : report.analyst.kind === "planning"
                            ? "bg-green-100 text-green-800"
                            : report.analyst.kind === "insights"
                              ? "bg-purple-100 text-purple-800"
                              : report.analyst.kind === "creation"
                                ? "bg-orange-100 text-orange-800"
                                : report.analyst.kind === "misc"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {report.analyst.kind || "N/A"}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/artifacts/report/${report.token}/share`}
                      target="_blank"
                      className="flex items-center gap-1"
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                      View Report
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
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