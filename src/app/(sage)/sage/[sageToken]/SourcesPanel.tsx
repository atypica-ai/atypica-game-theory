"use client";

import type { Sage, SageSource } from "@/prisma/client";
import type { SageExtra } from "../../types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  CircleXIcon,
  ClockIcon,
  Loader2Icon,
  PlayIcon,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { processSageSources } from "../../actions";

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
      <div className="space-y-3">
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">
              {source.title || t("untitledSource")}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {source.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      {source.extractedText && (
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">
            {source.extractedText.length} {t("characters")}
          </div>
        </CardContent>
      )}
      {source.error && (
        <CardContent className="pt-0">
          <div className="text-xs text-red-600">{source.error}</div>
        </CardContent>
      )}
    </Card>
  );
}
