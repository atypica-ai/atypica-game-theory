"use client";
import type { SageExtra } from "@/app/(sage)/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircleIcon, CheckCircleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function ProcessingStatusSection({
  processing,
  hasError,
  onRetry,
  isRetrying,
}: {
  processing?: SageExtra["processing"];
  hasError: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  const t = useTranslations("Sage.detail");

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>{t("processingError")}</AlertTitle>
          <AlertDescription className="mt-2">
            {processing?.error || t("unknownError")}
          </AlertDescription>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="ml-auto"
          >
            <RefreshCwIcon className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
            {t("retryProcessing")}
          </Button>
        )}
      </Alert>
    );
  }

  if (!processing) return null;

  const progress = processing.progress ?? 0;
  const step = processing.step || "pending";

  const stepLabels: Record<string, string> = {
    pending: t("step.pending"),
    parse_content: t("step.parseContent"),
    extract_knowledge: t("step.extractKnowledge"),
    build_memory_document: t("step.buildMemoryDocument"),
    analyze_completeness: t("step.analyzeCompleteness"),
    generate_embedding: t("step.generateEmbedding"),
  };

  const isComplete = progress >= 1;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircleIcon className="size-5 text-green-600 dark:text-green-400" />
            ) : (
              <Loader2Icon className="size-5 animate-spin text-zinc-600 dark:text-zinc-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {isComplete ? t("processingComplete") : t("processing")}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {stepLabels[step] || step}
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <Progress value={progress * 100} className="h-2" />
      </div>
    </div>
  );
}
