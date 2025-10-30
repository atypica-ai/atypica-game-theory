"use client";

import type { Sage, SageSource } from "@/prisma/client";
import type { SageExtra } from "../../types";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2Icon,
  CircleXIcon,
  ClockIcon,
  Loader2Icon,
  PlayIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { processSageSources } from "../../actions";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";

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
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingSources = sources.filter((s) => s.status === "pending");
  const processingSources = sources.filter((s) => s.status === "processing");
  const completedSources = sources.filter((s) => s.status === "completed");
  const failedSources = sources.filter((s) => s.status === "failed");

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
      toast.success("Started processing sources");
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error processing sources:", error);
      toast.error("Failed to process sources");
    } finally {
      setIsProcessing(false);
    }
  }, [sage.id, router]);

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
              Processing...
            </>
          ) : (
            <>
              <PlayIcon className="mr-2 h-4 w-4" />
              Process Sources ({pendingSources.length})
            </>
          )}
        </Button>
      )}

      <Separator />

      {/* Sources List */}
      <div className="space-y-1">
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} t={t} />
        ))}
      </div>

      {failedSources.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {failedSources.length} source(s) failed to process
        </div>
      )}
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
        return <Loader2Icon className="h-4 w-4 animate-spin text-blue-600" />;
      case "failed":
        return <CircleXIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSecondaryInfo = () => {
    if (source.type === "url") {
      const content = source.content as { url?: string };
      return content.url || "";
    } else if (source.type === "file") {
      const content = source.content as { name?: string };
      return content.name || "";
    } else if (source.type === "text") {
      return source.extractedText
        ? `${source.extractedText.length} ${t("characters")}`
        : "";
    }
    return "";
  };

  const handleClick = () => {
    if (source.type === "url") {
      const content = source.content as { url?: string };
      if (content.url) {
        window.open(content.url, "_blank");
      }
    } else if (source.type === "file") {
      const content = source.content as {
        objectUrl?: string;
        mimeType?: string;
      };
      if (content.objectUrl && content.mimeType) {
        window.open(
          proxiedObjectCdnUrl({
            objectUrl: content.objectUrl,
            mimeType: content.mimeType,
          }),
          "_blank",
        );
      }
    }
  };

  const isClickable = source.type === "url" || source.type === "file";

  return (
    <div
      className={`flex items-start gap-2 py-2 ${
        isClickable ? "cursor-pointer hover:bg-accent/30 rounded px-2 -mx-2 transition-colors" : ""
      }`}
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
        {source.error && (
          <div className="text-xs text-red-600 mt-1 line-clamp-2">{source.error}</div>
        )}
      </div>
    </div>
  );
}
