"use client";
import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { UserChatExtra } from "@/prisma/client";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { fetchIssueStudies, retryStudy } from "./actions";
import ErrorStudiesList from "./ErrorStudiesList";

type IssueStudy = ExtractServerActionData<typeof fetchIssueStudies>[number];

function getRunId(study: IssueStudy): string | null {
  return (study.extra as UserChatExtra)?.runId ?? null;
}

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  error: createParamConfig.boolean(false),
} as const;

export type IssueStudiesSearchParams = {
  page: number;
  error: boolean;
};

interface IssueStudiesPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function IssueStudiesPageClient({ initialSearchParams }: IssueStudiesPageClientProps) {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [studies, setStudies] = useState<IssueStudy[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Use query params hook for URL synchronization
  const {
    values: { page: currentPage, error: showErrorStudies },
    setParam,
  } = useListQueryParams<IssueStudiesSearchParams>({
    params: {
      page: createParamConfig.number(1),
      error: createParamConfig.boolean(false),
    },
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    if (showErrorStudies) {
      return;
    }
    setIsLoading(true);
    const result = await fetchIssueStudies(currentPage);
    if (!result.success) {
      setError(result.message);
    } else {
      setStudies(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, showErrorStudies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (study: IssueStudy) => {
    // Add confirmation dialog with warning
    const confirmRetry = window.confirm(
      "Warning: If you're not sure what this feature does, please do not continue. " +
        "This action will retry processing the study and may have unexpected consequences. " +
        "Do you want to continue?",
    );

    if (!confirmRetry) return;

    setProcessingIds((prev) => new Set(prev).add(study.id));
    setError("");
    try {
      const result = await retryStudy(study.id);
      if (!result.success) {
        setError(`Failed to retry study ${study.id}: ${result.message}`);
      } else {
        await fetchData(); // Refresh the list after successful retry
      }
    } catch (err) {
      setError(`Error retrying study ${study.id}: ${(err as Error).message}`);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(study.id);
        return newSet;
      });
    }
  };

  // Calculate duration in minutes
  const calculateDuration = (timestamp: string | null) => {
    if (!timestamp) return "-";
    const durationMs = Date.now() - parseInt(timestamp);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Determine if a study is "stuck" (running for more than 30 minutes)
  const isStudyStuck = (timestamp: string | null) => {
    if (!timestamp) return false;
    const durationMinutes = (Date.now() - parseInt(timestamp)) / 60000;
    return durationMinutes > 30;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Issue Studies Management</h1>

      {/* Toggle between views */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-error-studies"
            checked={showErrorStudies}
            onChange={(e) => {
              setParam("error", e.target.checked);
              setParam("page", 1); // Reset page when switching views
            }}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="show-error-studies" className="text-sm font-medium">
            Show Error Studies (Last 14 Days)
          </label>
        </div>
      </div>

      {showErrorStudies ? (
        <div>
          <p className="mb-6 text-muted-foreground">
            This view shows studies that encountered errors in the last 14 days.
          </p>
          <ErrorStudiesList
            onRetrySuccess={() => {}}
            initialPage={currentPage}
            onPageChange={(page) => setParam("page", page)}
          />
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <div>
          <p className="mb-6 text-muted-foreground">
            This page shows studies that are currently in progress. Studies running for more than 30
            minutes may be stuck. An investigation is required.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">
                {pagination?.totalCount} studies in progress
              </span>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
              Refresh
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            {studies.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No studies in progress</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {studies.map((study) => (
                  <div
                    key={study.id}
                    className={`p-4 ${isStudyStuck(getRunId(study)) ? "bg-destructive/5" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {study.title || "Untitled Study"}
                          </span>
                          {isStudyStuck(getRunId(study)) && (
                            <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                              Stuck
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="inline-block mr-4">User: {study.user.email}</span>
                          <span className="inline-block mr-4">
                            Token Balance:{" "}
                            {formatTokensNumber(
                              study.user.tokensAccount
                                ? study.user.tokensAccount.permanentBalance +
                                    study.user.tokensAccount.monthlyBalance
                                : 0,
                            )}
                          </span>
                          <span className="inline-block mr-4">
                            Paid: {study.user.paymentRecords.length}
                          </span>
                          <span className="inline-block mr-4">ID: {study.id}</span>
                          <span className="inline-block">Token: {study.token}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm">
                          Started:{" "}
                          {getRunId(study)
                            ? formatDate(new Date(parseInt(getRunId(study)!)), locale)
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {calculateDuration(getRunId(study))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/study/${study.token}/share`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Study
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRetry(study)}
                        disabled={processingIds.has(study.id)}
                      >
                        {processingIds.has(study.id) ? "Retrying..." : "Retry Study"}
                      </Button>
                    </div>
                  </div>
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
              <div className="text-sm text-muted-foreground">
                Total: {pagination.totalCount.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
