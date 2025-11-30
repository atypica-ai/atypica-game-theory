"use client";
import { reProcessSageSourcesAndExtractKnoledge } from "@/app/(sage)/(detail)/actions";
import { addSageSources, deleteSageSources } from "@/app/(sage)/(public)/actions";
import { AddSourcesContent } from "@/app/(sage)/components/AddSourcesContent";
import type { SageExtra, SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Sage, SageSource } from "@/prisma/client";
import {
  CheckCircle2Icon,
  CircleXIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const t = useTranslations("Sage.SourcesPanel");
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSources, setNewSources] = useState<SageSourceContent[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const completedSources = sources.filter((s) => !!s.extractedText);
  const failedSources = sources.filter((s) => !!s.extra.error);
  const isProcessing = useMemo(
    () =>
      (sage.extra.processing && Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) ||
      isRequesting,
    [sage.extra.processing, isRequesting],
  );

  const canModifySources = !isProcessing;
  const maxSources = 30;

  // Auto-refresh when processing
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, router]);

  const handleProcessSources = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await reProcessSageSourcesAndExtractKnoledge(sage.id);
      if (!result.success) throw result;
      toast.success(t("processingStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error processing sources:", error);
      toast.error(t("processingFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  const handleConfirmAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      const result = await addSageSources(sage.id, newSources);
      if (!result.success) throw result;
      toast.success(t("sourcesAdded", { count: result.data.addedCount }));
      setNewSources([]);
      setShowAddDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error adding sources:", error);
      toast.error(t("addSourcesFailed"));
    } finally {
      setIsAdding(false);
    }
  }, [sage.id, newSources, router, t]);

  const handleCloseDialog = useCallback(() => {
    if (isAdding) return;
    setNewSources([]);
    setShowAddDialog(false);
  }, [isAdding]);

  const handleDeleteSource = useCallback(
    async (sourceId: number) => {
      try {
        const result = await deleteSageSources(sage.id, [sourceId]);
        if (!result.success) throw result;
        toast.success(t("sourceDeleted"));
        router.refresh();
      } catch (error) {
        console.error("Error deleting source:", error);
        toast.error(t("deleteSourceFailed"));
      }
    },
    [sage.id, router, t],
  );

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">{t("knowledgeSources")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sources.length}/{maxSources} {t("sources")} • {completedSources.length}/
              {sources.length} {t("parsed")}
            </p>
          </div>
          <div className="flex gap-2">
            {canModifySources && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                disabled={sources.length >= maxSources}
              >
                <PlusIcon className="size-4" />
                {t("addSources")}
              </Button>
            )}
            {isProcessing ? (
              <Button disabled={true} size="sm">
                <Loader2Icon className="size-4 animate-spin" />
                {t("processingButton")}
              </Button>
            ) : (
              <ConfirmDialog
                title={t("reProcessAndExtract")}
                description={t("reProcessAndExtractDesc")}
                onConfirm={() => handleProcessSources()}
              >
                <Button size="sm">
                  <SparklesIcon className="size-4" />
                  {t("reProcessAndExtract")}
                </Button>
              </ConfirmDialog>
            )}
          </div>
        </div>

        <Separator />

        {/* Sources List */}
        {sources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">{t("noSources")}</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
              <PlusIcon className="size-4" />
              {t("addFirstSource")}
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {sources.map((source) => (
              <SourceItem
                key={source.id}
                source={source}
                onDelete={canModifySources ? handleDeleteSource : undefined}
              />
            ))}
          </div>
        )}

        {failedSources.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {failedSources.length} {t("sourcesFailedCount")}
          </div>
        )}
      </div>

      {/* Add Sources Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl sm:max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("addSourcesDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin -mx-6 px-6">
            <AddSourcesContent
              sources={newSources}
              onSourcesChange={setNewSources}
              currentSourceCount={sources.length}
              maxSources={maxSources}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isAdding}>
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirmAdd} disabled={newSources.length === 0 || isAdding}>
              {isAdding ? t("adding") : t("confirmAdd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SourceItem({
  source,
  onDelete,
}: {
  source: Omit<SageSource, "content" | "extra"> & {
    content: SageSourceContent;
    extra: SageSourceExtra;
  };
  onDelete?: (sourceId: number) => void;
}) {
  const t = useTranslations("Sage.SourcesPanel");

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
    <div className={cn("flex items-start gap-2 group relative px-2 -mx-2 py-2")}>
      <div className="h-5 flex items-center">{getStatusIcon()}</div>
      <div
        className={cn("flex-1 min-w-0", isClickable ? "cursor-pointer" : "")}
        onClick={isClickable ? handleClick : undefined}
      >
        <div className="h-5 text-sm text-foreground flex items-center gap-1">
          <div className="truncate">{source.title || t("untitledSource")}</div>
          {isClickable && <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />}
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
      {onDelete && (
        <ConfirmDialog
          title={t("confirmDeleteTitle")}
          description={t("confirmDeleteDesc")}
          onConfirm={() => onDelete(source.id)}
        >
          <Button
            size="icon"
            variant="ghost"
            title={t("deleteSource")}
            className="size-8 hidden group-hover:flex"
          >
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </ConfirmDialog>
      )}
    </div>
  );
}
