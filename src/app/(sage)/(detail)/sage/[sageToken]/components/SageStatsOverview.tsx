"use client";

import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { addSageSources } from "@/app/(sage)/(public)/actions";
import { discoverKnowledgeGapsAction, extractSageKnowledgeAction } from "@/app/(sage)/actions";
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
import { cn } from "@/lib/utils";
import {
  DatabaseIcon,
  EyeIcon,
  FileTextIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SageShareButton } from "./SageShareButton";

export function SageStatsOverview() {
  const t = useTranslations("Sage.SageStats");
  const router = useRouter();
  const { sage, processingStatus, stats } = useSageContext();
  const [isRequesting, setIsRequesting] = useState(false);

  // Add Sources Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSources, setNewSources] = useState<SageSourceContent[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const isProcessing = processingStatus === "processing" || isRequesting;
  const maxSources = 30;

  const handleExtract = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await extractSageKnowledgeAction(sage.id);
      if (!result.success) throw result;
      toast.success(t("processingStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Error extracting knowledge:", error);
      toast.error(t("processingFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  const handleAnalyze = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await discoverKnowledgeGapsAction({ sageId: sage.id });
      if (!result.success) throw result;
      toast.success("Analysis started");
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Failed to analyze chats:", error);
      toast.error("Analysis failed");
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router]);

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

  // Derive status for sources
  const sourcesStatus =
    processingStatus === "processing"
      ? "processing"
      : stats.sourcesTotal > stats.sourcesExtracted
        ? "attention"
        : stats.sourcesTotal === 0
          ? "ready"
          : "completed";

  // Derive status for memory
  const memoryStatus =
    processingStatus === "processing"
      ? "processing"
      : stats.workingMemoryPendingCount > 0
        ? "attention"
        : "completed";

  // Derive status for gaps
  const gapsStatus = stats.gapsCount > 0 ? "attention" : "completed";

  return (
    <>
      <div
        className={cn(
          "p-6 mt-4 sm:m-6",
          "overflow-x-scroll sm:overflow-hidden",
          "sm:border sm:rounded-xl sm:shadow-xs sm:bg-card",
        )}
      >
        {/* Global Status Indicator */}
        {isProcessing && (
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full self-start">
            <Loader2Icon className="size-3 animate-spin" />
            {t("processingPipeline")}
          </div>
        )}

        <div
          className={cn(
            "gap-6",
            "max-sm:w-fit max-sm:flex max-sm:flex-row max-sm:flex-nowrap",
            "sm:grid sm:grid-cols-3 xl:grid-cols-5",
          )}
        >
          {/* 1. Sources */}
          <StageCard
            icon={<FileTextIcon className="size-5" />}
            status={sourcesStatus}
            label={t("sources")}
            count={stats.sourcesTotal}
            description={
              stats.sourcesTotal > stats.sourcesExtracted
                ? t("sourcesWaiting", { count: stats.sourcesTotal - stats.sourcesExtracted })
                : t("sourcesParsed", { count: stats.sourcesExtracted })
            }
          >
            <ConfirmDialog
              title={t("confirmExtractTitle")}
              description={t("confirmExtractDesc")}
              onConfirm={handleExtract}
            >
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={isProcessing}
              >
                <SparklesIcon className="size-3" />
                {t("extract")}
              </Button>
            </ConfirmDialog>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowAddDialog(true)}
              disabled={isProcessing}
            >
              <PlusIcon className="size-3" />
              {t("addSource")}
            </Button>
          </StageCard>

          {/* 2. Memory */}
          <StageCard
            icon={<DatabaseIcon className="size-5" />}
            status={memoryStatus}
            label={t("memory")}
            count={stats.memoryVersion}
            description={
              processingStatus === "processing"
                ? t("integrating")
                : stats.workingMemoryPendingCount > 0
                  ? t("itemsPending", { count: stats.workingMemoryPendingCount })
                  : t("synced")
            }
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => router.push(`/sage/${sage.token}/memory`)}
            >
              <EyeIcon className="size-3" />
              {t("viewMemory")}
            </Button>
          </StageCard>

          {/* 3. Knowledge Gaps */}
          <StageCard
            icon={<TriangleAlertIcon className="size-5" />}
            status={gapsStatus}
            label={t("knowledgeGaps")}
            count={stats.gapsCount}
            description={t("itemsPending", { count: stats.gapsCount })}
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => router.push(`/sage/${sage.token}/gaps`)}
            >
              <EyeIcon className="size-3" />
              {t("viewGaps")}
            </Button>
            <ConfirmDialog
              title={t("confirmAnalyzeTitle")}
              description={t("confirmAnalyzeDesc")}
              onConfirm={handleAnalyze}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={isProcessing}
              >
                <SparklesIcon className="size-3" />
                {t("analyzeChats")}
              </Button>
            </ConfirmDialog>
          </StageCard>

          {/* 4. User Chats */}
          <StageCard
            icon={<MessageSquareIcon className="size-5" />}
            status="ready"
            label={t("userChats")}
            count={stats.chatsCount}
            description={t("chatsDescription", { count: stats.chatsCount })}
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => router.push(`/sage/${sage.token}/chats`)}
            >
              <EyeIcon className="size-3" />
              {t("viewChats")}
            </Button>
            <SageShareButton
              sageToken={sage.token}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            />
          </StageCard>

          {/* 5. Interviews */}
          <StageCard
            icon={<MicIcon className="size-5" />}
            status="ready"
            label={t("interviews")}
            count={stats.interviewsCount}
            description={t("interviewsDescription", { count: stats.interviewsCount })}
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => router.push(`/sage/${sage.token}/interviews`)}
            >
              <EyeIcon className="size-3" />
              {t("viewInterviews")}
            </Button>
          </StageCard>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl sm:max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("addSourcesDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin -mx-6 px-6">
            <AddSourcesContent
              sources={newSources}
              onSourcesChange={setNewSources}
              currentSourceCount={stats.sourcesTotal || 0}
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

// Simple StageCard component
function StageCard({
  icon,
  status,
  label,
  count,
  description,
  children,
}: {
  icon: React.ReactNode;
  status: "ready" | "processing" | "attention" | "completed";
  label: string;
  count?: number;
  description?: string;
  children?: React.ReactNode;
}) {
  const statusColors = {
    ready: "border-muted-foreground/30 text-muted-foreground",
    processing: "border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/10",
    attention: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10",
    completed: "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/10",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Icon and Info */}
      <div className="flex flex-col items-center text-center gap-2">
        <div
          className={cn(
            "size-12 rounded-full border-2 flex items-center justify-center transition-colors",
            statusColors[status],
          )}
        >
          {status === "processing" ? <Loader2Icon className="size-5 animate-spin" /> : icon}
        </div>
        <div>
          <div className="font-medium text-sm flex items-center gap-2 justify-center">
            <span className="whitespace-nowrap">{label}</span>
            {count !== undefined && (
              <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
      </div>

      {/* Actions */}
      {children && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}
