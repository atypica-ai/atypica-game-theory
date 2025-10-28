"use client";

import type { SageSource } from "@/prisma/client";
import { CheckCircle2Icon, FileTextIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function SourcesSection({ sources }: { sources: SageSource[] }) {
  const t = useTranslations("Sage.detail");

  const completedCount = sources.filter((s) => s.status === "completed").length;
  const failedCount = sources.filter((s) => s.status === "failed").length;
  const processingCount = sources.filter((s) => s.status === "processing").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2Icon className="size-4 text-green-600 dark:text-green-400" />;
      case "processing":
        return <Loader2Icon className="size-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case "failed":
        return <XCircleIcon className="size-4 text-red-600 dark:text-red-400" />;
      default:
        return <Loader2Icon className="size-4 text-zinc-400 animate-spin" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("sourceCompleted");
      case "processing":
        return t("sourceProcessing");
      case "failed":
        return t("sourceFailed");
      default:
        return t("sourcePending");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "processing":
        return "text-blue-600 dark:text-blue-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-zinc-500";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t("knowledgeSources")}
        </h3>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {completedCount} / {sources.length} {t("completed")}
          {failedCount > 0 && (
            <span className="ml-2 text-red-600 dark:text-red-400">
              ({failedCount} {t("failed")})
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <div className="mt-0.5">{getStatusIcon(source.status)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileTextIcon className="size-4 text-zinc-500 flex-shrink-0" />
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {source.title || t("untitledSource")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={getStatusColor(source.status)}>{getStatusText(source.status)}</span>
                {source.extractedText && (
                  <>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-500">
                      {source.extractedText.length.toLocaleString()} {t("characters")}
                    </span>
                  </>
                )}
              </div>

              {source.error && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {t("error")}: {source.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {processingCount > 0 && (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
          <Loader2Icon className="size-4 animate-spin" />
          {t("processingInBackground")}
        </div>
      )}
    </div>
  );
}
