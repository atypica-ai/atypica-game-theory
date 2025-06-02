"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { CameraIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { PaginationInfo } from "../types";
import { adminGenerateScreenshotAction, fetchAnalystReports } from "./actions";

type AnalystReportWithAnalyst = ExtractServerActionData<typeof fetchAnalystReports>[number];

export default function AnalystReportsPage() {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [analystReports, setAnalystReports] = useState<AnalystReportWithAnalyst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingScreenshots, setGeneratingScreenshots] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }
    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchAnalystReports(currentPage, 12, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setAnalystReports(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/analyst-reports");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

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

  if (status === "loading" || isLoading) {
    return <div className="container mt-8">Loading...</div>;
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
              setSearchQuery("");
              setCurrentPage(1);
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
              <Card key={report.id} className="relative pt-0 pb-0">
                {report.coverUrl && (
                  <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                    <Image
                      src={report.coverUrl}
                      alt={`Cover for ${report.analyst.topic}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="mt-6 flex items-center justify-between w-full overflow-hidden">
                    <div className="truncate leading-normal">{report.analyst.topic}</div>
                  </CardTitle>
                  <CardDescription>{report.analyst.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Token: <span className="font-mono">{report.token}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      User: {report.analyst.user?.email || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generated:{" "}
                      {report.generatedAt
                        ? formatDate(report.generatedAt, locale)
                        : "Not generated"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created: {formatDate(report.createdAt, locale)}
                    </p>
                    {report.instruction && (
                      <p className="text-sm line-clamp-3 mt-2">
                        <span className="font-medium">Instruction:</span> {report.instruction}
                      </p>
                    )}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2 items-center justify-between">
                  <div className="flex gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateScreenshot(report.id)}
                      disabled={generatingScreenshots.has(report.id) || !!report.coverUrl}
                      className="flex items-center gap-1"
                    >
                      <CameraIcon className="h-3 w-3" />
                      {generatingScreenshots.has(report.id)
                        ? "Generating..."
                        : "Generate Cover (Testing)"}
                    </Button>
                  </div>
                </div>
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
