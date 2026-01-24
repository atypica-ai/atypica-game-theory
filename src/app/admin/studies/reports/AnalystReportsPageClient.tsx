"use client";
import { PaginationInfo } from "@/app/admin/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import {
  CameraIcon,
  ChevronDown,
  ChevronUp,
  ExternalLinkIcon,
  SearchIcon,
  Star,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  adminGenerateScreenshotAction,
  featureReportAction,
  fetchAnalystReportsAction,
  updateFeaturedItemTagsAction,
} from "./actions";
import { TagsInput } from "./TagsInput";

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
  initialSearchParams: Record<string, string | number | boolean>;
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
  const [togglingFeatured, setTogglingFeatured] = useState<Set<number>>(new Set());
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

  const handleGenerateScreenshot = async (reportId: number) => {
    setGeneratingScreenshots((prev) => new Set(prev).add(reportId));
    try {
      const result = await adminGenerateScreenshotAction(reportId);
      if (!result.success) throw result;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      // 不需要去掉，因为是异步的
      // setGeneratingScreenshots((prev) => {
      //   const newSet = new Set(prev);
      //   newSet.delete(reportId);
      //   return newSet;
      // });
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

  const handleToggleFeatured = async (reportId: number, isFeatured: boolean) => {
    setTogglingFeatured((prev) => new Set(prev).add(reportId));
    try {
      const result = await featureReportAction(reportId);
      if (!result.success) {
        setError(result.message);
      } else {
        // Update local state
        setAnalystReports((prev) =>
          prev.map((report) => {
            if (report.id === reportId) {
              // When featuring, set tags to analyst.kind; when unfeaturing, clear tags
              const tags = !isFeatured ? report.analyst.kind || "" : "";
              return { ...report, isFeatured: !isFeatured, tags };
            }
            return report;
          }),
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTogglingFeatured((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const handleUpdateTags = async (reportId: number, tags: string) => {
    try {
      const result = await updateFeaturedItemTagsAction(reportId, tags);
      if (!result.success) {
        setError(result.message);
      } else {
        // Update local state
        setAnalystReports((prev) =>
          prev.map((report) => (report.id === reportId ? { ...report, tags } : report)),
        );
      }
    } catch (err) {
      setError((err as Error).message);
    }
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
        <div className="flex items-center space-x-2">
          <Switch
            id="featured-only"
            checked={featuredOnly}
            onCheckedChange={(checked) => setParams({ featured: checked, page: 1 })}
          />
          <Label htmlFor="featured-only">Featured only</Label>
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
              <Card
                key={report.id}
                className={report.isFeatured ? "border-2 border-yellow-400" : ""}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between w-full overflow-hidden gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="leading-normal truncate font-semibold">
                        <span className="text-xs text-muted-foreground font-normal">Brief: </span>
                        {report.analyst.brief || "Untitled Report"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFeatured(report.id, !!report.isFeatured)}
                      disabled={togglingFeatured.has(report.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                      title={report.isFeatured ? "Remove from featured" : "Add to featured"}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          report.isFeatured
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-400 hover:text-yellow-400"
                        } transition-colors`}
                      />
                    </button>
                  </CardTitle>
                  <CardDescription>
                    <span className="text-xs text-muted-foreground">Role: </span>
                    {report.analyst.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Cover Image */}
                  {report.coverCdnHttpUrl && (
                    <div className="relative w-full aspect-video overflow-hidden rounded-lg mb-4">
                      <Image
                        loader={({ src }) => src}
                        src={report.coverCdnHttpUrl}
                        alt="report cover"
                        fill
                        className="object-cover"
                        sizes="1000px"
                      />
                    </div>
                  )}

                  {/* Generate Cover Button - Always visible */}
                  <div className="mb-4">
                    <ConfirmDialog
                      title="Regenerate Cover Image"
                      description={
                        report.coverCdnHttpUrl
                          ? "This will replace the existing cover image. Are you sure?"
                          : "Generate a new cover image for this report?"
                      }
                      onConfirm={() => handleGenerateScreenshot(report.id)}
                      confirmLabel="Generate"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generatingScreenshots.has(report.id)}
                        className="flex items-center gap-1"
                      >
                        <CameraIcon className="h-3 w-3" />
                        {generatingScreenshots.has(report.id)
                          ? "Generating..."
                          : report.coverCdnHttpUrl
                            ? "Regenerate Cover"
                            : "Generate Cover"}
                      </Button>
                    </ConfirmDialog>
                  </div>

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
                  <div className="flex items-start justify-between gap-4 border-t pt-3">
                    <div className="shrink-0 space-y-1 text-sm text-muted-foreground">
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
                    <div className="relative h-24 w-24 overflow-hidden rounded-sm">
                      <Image
                        // loader={proxiedImageLoader} // mainland 加载 us s3 的资源需要 proxy
                        // src={`${getObjectCdnOrigin()}/artifacts/report/${report.token}/cover`}
                        // 用 cdn 域名会让 /_next/image 的后端超时（能成功请求的，就是时间有点久）
                        // 而且现在 cdn 域名只应用于 /cdn 路由了，这里不用其实问题也不大，拿掉没问题
                        src={`/artifacts/report/${report.token}/cover?inContent=1&square=1`}
                        alt="report cover"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 mt-auto">
                  {/* Tags Input - Only for featured reports */}
                  {report.isFeatured && (
                    <div className="w-full">
                      <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Tags
                      </Label>
                      <TagsInput
                        value={report.tags || ""}
                        onChange={(tags) => handleUpdateTags(report.id, tags)}
                      />
                    </div>
                  )}

                  <div className="w-full flex gap-2 items-center justify-between flex-wrap">
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
                  </div>
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
