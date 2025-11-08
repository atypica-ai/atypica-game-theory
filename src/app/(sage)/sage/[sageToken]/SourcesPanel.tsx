"use client";

import { processSageSources } from "@/app/(sage)/actions";
import type { SageExtra, SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Sage, SageSource } from "@/prisma/client";
import {
  CheckCircle2Icon,
  CircleXIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlayIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function SourcesPanel({
  sage,
  sources,
}: {
  sage: Omit<Sage, "extra"> & { extra: SageExtra };
  sources: (Omit<SageSource, "content" | "extra"> & {
    content: SageSourceContent;
    extra: SageSourceExtra;
  })[];
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingSources = sources.filter(
    (s) => !s.extractedText && !s.extra.processing && !s.extra.error,
  );
  const processingSources = sources.filter((s) => s.extra.processing);
  const completedSources = sources.filter((s) => !!s.extractedText);
  const failedSources = sources.filter((s) => !!s.extra.error);

  const hasProcessing = processingSources.length > 0;
  const hasPending = pendingSources.length > 0;

  // Auto-refresh when processing
  useEffect(() => {
    if (hasProcessing) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasProcessing, router]);

  const handleProcessSources = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await processSageSources(sage.id);
      if (!result.success) throw result;
      toast.success(t("processingStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error processing sources:", error);
      toast.error(t("processingFailed"));
    } finally {
      setIsProcessing(false);
    }
  }, [sage.id, router, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">{t("knowledgeSources")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {completedSources.length}/{sources.length} {t("completed")}
        </p>
      </div>

      {/* Process Button */}
      {(hasPending || hasProcessing) && (
        <Button
          onClick={handleProcessSources}
          disabled={isProcessing || hasProcessing}
          className="w-full"
          size="lg"
        >
          {hasProcessing ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              {t("processingButton")}
            </>
          ) : (
            <>
              <PlayIcon className="mr-2 h-4 w-4" />
              {t("processSourcesButton")} ({pendingSources.length})
            </>
          )}
        </Button>
      )}

      <Separator />

      {/* Sources List */}
      <div className="space-y-1">
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
      </div>

      {failedSources.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {failedSources.length} {t("sourcesFailedCount")}
        </div>
      )}
    </div>
  );
}

function SourceItem({
  source,
}: {
  source: Omit<SageSource, "content" | "extra"> & {
    content: SageSourceContent;
    extra: SageSourceExtra;
  };
}) {
  const t = useTranslations("Sage.detail");

  const getStatusIcon = () => {
    const status = source.extractedText
      ? "completed"
      : source.extra.processing
        ? "processing"
        : source.extra.error
          ? "failed"
          : "pending";
    switch (status) {
      case "completed":
        return <CheckCircle2Icon className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Loader2Icon className="h-4 w-4 animate-spin text-blue-600" />;
      case "failed":
        return <CircleXIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSecondaryInfo = () => {
    if (source.content.type === "url") {
      return source.content.url || "";
    } else if (source.content.type === "file") {
      return source.content.name || "";
    } else if (source.content.type === "text") {
      return source.extractedText ? `${source.extractedText.length} ${t("characters")}` : "";
    }
    return "";
  };

  const handleClick = useCallback(() => {
    if (source.content.type === "url") {
      window.open(source.content.url, "_blank");
    } else if (source.content.type === "file") {
      window.open(
        proxiedObjectCdnUrl({
          name: source.content.name,
          objectUrl: source.content.objectUrl,
          mimeType: source.content.mimeType,
        }),
        "_blank",
      );
    }
  }, [source]);

  const isClickable = source.content.type === "url" || source.content.type === "file";

  return (
    <div
      className={cn(
        "flex items-start gap-2 py-2",
        isClickable ? "cursor-pointer hover:bg-accent/30 rounded px-2 -mx-2 transition-colors" : "",
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate flex items-center gap-1">
          {source.title || t("untitledSource")}
          {isClickable && <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />}
        </div>
        {getSecondaryInfo() && (
          <div className="text-xs text-muted-foreground/60 truncate mt-0.5">
            {getSecondaryInfo()}
          </div>
        )}
        {source.extra.error && (
          <div className="text-xs text-red-600 mt-1 line-clamp-2">{source.extra.error}</div>
        )}
      </div>
    </div>
  );
}
