"use client";
import { fetchSageSourcesByTokenAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { addSageSources, deleteSageSources } from "@/app/(sage)/(public)/actions";
import { extractSageKnowledgeAction } from "@/app/(sage)/actions";
import { AddSourcesContent } from "@/app/(sage)/components/AddSourcesContent";
import type { SageSourceContent } from "@/app/(sage)/types";
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
import { trackEvent } from "@/lib/analytics/segment";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function SourcesPanel() {
  const t = useTranslations("Sage.SourcesPanel");
  const router = useRouter();
  const { sage, processingStatus } = useSageContext();

  const [sources, setSources] = useState<
    ExtractServerActionData<typeof fetchSageSourcesByTokenAction>
  >([]);

  const fetchSageSources = useCallback(async () => {
    try {
      const result = await fetchSageSourcesByTokenAction(sage.token);
      if (!result.success) throw result;
      setSources(result.data);
    } catch {
      toast.error(t("fetchSourcesFailed"));
    }
  }, [sage.token, t]);

  useEffect(() => {
    fetchSageSources();
  }, [fetchSageSources]);

  const prevProcessingStatusRef = useRef(processingStatus);
  // 处理结束以后，刷新一下 sources
  useEffect(() => {
    if (prevProcessingStatusRef.current !== "ready" && processingStatus === "ready") {
      fetchSageSources();
    }
    prevProcessingStatusRef.current = processingStatus;
  }, [processingStatus, fetchSageSources]);

  const [isRequesting, setIsRequesting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSources, setNewSources] = useState<SageSourceContent[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const completedSources = sources.filter((s) => !!s.extractedTextDigest);

  // Wrapped setNewSources to track events when sources change
  const handleNewSourcesChange = useCallback(
    (newSourcesList: SageSourceContent[]) => {
      // Track if sources increased
      if (newSourcesList.length > newSources.length) {
        trackEvent("Sage Source Updated", {
          sageId: sage.id,
          sourcesCount: sources.length + newSourcesList.length,
        });
      }
      setNewSources(newSourcesList);
    },
    [newSources.length, sage.id, sources.length],
  );

  const failedSources = sources.filter((s) => !!s.extra.error);
  const isProcessing = processingStatus === "processing" || isRequesting;
  const canModifySources = processingStatus !== "processing" && !isRequesting;
  const maxSources = 30;

  const handleProcessSources = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await extractSageKnowledgeAction(sage.id);
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
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("knowledgeSources")}
            </h2>
            <div className="text-xs text-muted-foreground font-medium">
              {completedSources.length} / {sources.length} {t("parsed")}
            </div>
          </div>

          <div className="flex gap-2 w-full">
            {canModifySources && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setShowAddDialog(true)}
                disabled={sources.length >= maxSources}
              >
                <PlusIcon className="size-3.5" />
                {t("addSources")}
              </Button>
            )}
            {isProcessing ? (
              <Button disabled={true} size="sm" className="flex-1 h-8 text-xs">
                <Loader2Icon className="size-3.5 animate-spin" />
                {t("processingButton")}
              </Button>
            ) : (
              <ConfirmDialog
                title={t("reProcessAndExtract")}
                description={t("reProcessAndExtractDesc")}
                onConfirm={() => handleProcessSources()}
              >
                <Button size="sm" className="flex-1 h-8 text-xs" variant="secondary">
                  <SparklesIcon className="size-3.5" />
                  {t("reProcessAndExtract")}
                </Button>
              </ConfirmDialog>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          {sources.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              onDelete={canModifySources ? handleDeleteSource : undefined}
            />
          ))}
        </div>

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
              onSourcesChange={handleNewSourcesChange}
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
  source: ExtractServerActionData<typeof fetchSageSourcesByTokenAction>[number];
  onDelete?: (sourceId: number) => void;
}) {
  const t = useTranslations("Sage.SourcesPanel");

  const getStatusIcon = () => {
    const status = source.extractedTextDigest
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
      return `${source.content.text}`;
    }
    return "";
  };

  const handleClick = useCallback(async () => {
    if (source.content.type === "url") {
      window.open(source.content.url, "_blank");
    } else if (source.content.type === "file") {
      window.open(
        await getS3SignedCdnUrl(source.content.objectUrl),
        // proxiedObjectCdnUrl({
        //   name: source.content.name,
        //   objectUrl: source.content.objectUrl,
        //   mimeType: source.content.mimeType,
        // }),
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
