"use client";

import type { Sage, SageSource } from "@/prisma/client";
import type { SageExtra } from "../../types";
import { CheckCircle2Icon, CircleXIcon, ClockIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { retrySageProcessing } from "../../actions";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };

export function SourcesPanel({
  sage,
  sources,
}: {
  sage: SageWithExtra;
  sources: SageSource[];
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const processing = sage.extra?.processing;
  const hasError = !!processing?.error;

  // Auto-refresh when processing
  useEffect(() => {
    if (processing && (processing.progress ?? 0) < 1 && !hasError) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [processing, hasError, router]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const result = await retrySageProcessing(sage.id);
      if (!result.success) throw result;
      toast.success(t("retryStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error retrying processing:", error);
      toast.error(t("retryFailed"));
    } finally {
      setIsRetrying(false);
    }
  }, [sage.id, t, router]);

  const completedSources = sources.filter((s) => s.status === "completed");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">{t("knowledgeSources")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {completedSources.length}/{sources.length} {t("completed")}
        </p>
      </div>

      {/* Error Alert */}
      {hasError && (
        <Alert variant="destructive">
          <CircleXIcon className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle>{t("processingError")}</AlertTitle>
            <AlertDescription className="mt-2">
              {processing?.error || t("unknownError")}
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-auto"
          >
            <RefreshCwIcon className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
            {t("retryProcessing")}
          </Button>
        </Alert>
      )}

      {/* Processing Status */}
      {processing && (processing.progress ?? 0) < 1 && !hasError && (
        <Alert>
          <Loader2Icon className="h-4 w-4 animate-spin" />
          <AlertTitle>{t("processingInBackground")}</AlertTitle>
        </Alert>
      )}

      {/* Sources List */}
      <div className="space-y-3">
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} t={t} />
        ))}
      </div>
    </div>
  );
}

function SourceItem({
  source,
  t,
}: {
  source: SageSource;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const getStatusIcon = () => {
    switch (source.status) {
      case "completed":
        return <CheckCircle2Icon className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Loader2Icon className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <CircleXIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (source.status) {
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

  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {source.title || t("untitledSource")}
          </div>
          <div className="text-sm text-muted-foreground">{getStatusText()}</div>
        </div>
      </div>

      {source.extractedText && (
        <div className="text-xs text-muted-foreground">
          {source.extractedText.length} {t("characters")}
        </div>
      )}

      {source.error && (
        <div className="text-xs text-red-600 mt-2">
          {t("error")}: {source.error}
        </div>
      )}
    </div>
  );
}
