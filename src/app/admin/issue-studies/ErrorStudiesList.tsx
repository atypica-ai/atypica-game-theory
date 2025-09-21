"use client";
import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { fetchErrorStudies, retryStudy } from "./actions";

type ErrorStudy = ExtractServerActionData<typeof fetchErrorStudies>[number];

interface ErrorStudiesListProps {
  onRetrySuccess?: () => void;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export default function ErrorStudiesList({
  onRetrySuccess,
  initialPage = 1,
  onPageChange,
}: ErrorStudiesListProps) {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [studies, setStudies] = useState<ErrorStudy[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Use query params hook for URL synchronization
  type ErrorStudiesSearchParams = {
    page: number;
  };

  const {
    values: { page: currentPage },
    setParam,
  } = useListQueryParams<ErrorStudiesSearchParams>({
    params: {
      page: createParamConfig.number(1),
    },
    initialValues: { page: initialPage },
  });

  // Update current page when initialPage changes
  useEffect(() => {
    if (initialPage !== currentPage) {
      setParam("page", initialPage);
    }
  }, [initialPage, currentPage, setParam]);

  const fetchData = useCallback(async () => {
    // No need to wait for URL parsing as we use server-parsed params

    setIsLoading(true);
    const result = await fetchErrorStudies(currentPage);
    if (!result.success) {
      setError(result.message);
    } else {
      setStudies(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (study: ErrorStudy) => {
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
        onRetrySuccess?.();
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading error studies...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing studies with errors from the last 14 days
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">
            {pagination?.totalCount} studies with errors
          </span>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {studies.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No studies with errors found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {studies.map((study) => (
              <div key={study.id} className="p-4 bg-destructive/5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {study.title || "Untitled Study"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                          Error
                        </span>
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
                        Updated: {formatDate(new Date(study.updatedAt), locale)}
                      </div>
                      <div className="text-sm">
                        Created: {formatDate(new Date(study.createdAt), locale)}
                      </div>
                    </div>
                  </div>

                  {/* Error Message Display */}
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <div className="text-sm font-medium text-destructive mb-1">Error Message:</div>
                    <div className="text-sm text-destructive/80 font-mono break-words">
                      {study.errorMessage}
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
            onPageChange={(page) => {
              setParam("page", page);
              onPageChange?.(page);
            }}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
