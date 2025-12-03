"use client";
import { createSageInterviewAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { addSageSources } from "@/app/(sage)/(public)/actions";
import { discoverKnowledgeGapsAction } from "@/app/(sage)/actions";
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
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  DatabaseIcon,
  FileTextIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SageShareButton } from "./SageShareButton";

export function SageGuide() {
  const t = useTranslations("Sage.SageGuide");
  const router = useRouter();
  const { sage, processingStatus, stats } = useSageContext();
  const [isRequesting, setIsRequesting] = useState(false);

  // Add Sources State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSources, setNewSources] = useState<SageSourceContent[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const handleConfirmAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      const result = await addSageSources(sage.id, newSources);
      if (!result.success) throw result;
      toast.success(t("sourcesAddedSuccess"));
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

  // Analyze Chats Action
  const handleAnalyze = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await discoverKnowledgeGapsAction({ sageId: sage.id });
      if (!result.success) throw result;
      toast.success(t("analysisStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Failed to analyze chats:", error);
      toast.error(t("analyzeChatsFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  // Start Interview Action
  const handleStartInterview = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await createSageInterviewAction(sage.id);
      if (!result.success) throw result;
      const { userChat } = result.data;
      toast.success(t("interviewCreated"));
      router.push(`/sage/interview/${userChat.token}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
      toast.error(t("createInterviewFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  // Determine current stage
  const getStage = () => {
    if (processingStatus === "processing") return "processing";
    if (stats.sourcesTotal === 0) return "no_sources";
    // 暂时还没有这个功能
    if (false && stats.workingMemoryPendingCount > 0) return "integrate_memory";
    if (stats.gapsCount > 0) return "fill_gaps";
    if (stats.chatsCount > 0) return "analyze_chats"; // Assuming we want to analyze if chats exist but no gaps found yet? Or maybe just keep analyzing?
    // If chats exist but no gaps and no pending memory, maybe we are good?
    // Let's stick to the plan: if chats > 0 and no gaps, suggest analyze.
    // But if we just analyzed and found nothing, it might be annoying.
    // For now, let's assume "analyze_chats" is good if we have chats.
    // Actually, if we have chats, we should probably check if they are analyzed?
    // The API doesn't tell us if all chats are analyzed.
    // Let's put "share" as the default fallback if everything else is done.
    return "share";
  };

  const stage = getStage();

  if (stage === "share" && stats.chatsCount > 0) {
    // If we have chats and no gaps/pending memory, we might want to suggest analyzing again?
    // Or just stay on "share" but maybe with a different message?
    // For simplicity, let's stick to "share" or "analyze_chats".
    // If chats > 0, let's prioritize "analyze_chats" only if we haven't analyzed recently?
    // We don't have that info.
    // Let's just use "share" as the "all good" state.
  }

  // Render content based on stage
  const renderContent = () => {
    switch (stage) {
      case "processing":
        return {
          icon: <Loader2Icon className="size-6 text-blue-500 animate-spin" />,
          title: t("processingTitle"),
          desc: t("processingDesc"),
          action: (
            <Button disabled variant="outline">
              <Loader2Icon className="size-4 animate-spin" />
              {t("processingButton")}
            </Button>
          ),
        };
      case "no_sources":
        return {
          icon: <FileTextIcon className="size-6 text-orange-500" />,
          title: t("noSourcesTitle"),
          desc: t("noSourcesDesc"),
          action: (
            <Button onClick={() => setShowAddDialog(true)}>
              {t("addSourcesButton")}
              <ArrowRightIcon className="size-4" />
            </Button>
          ),
        };
      case "integrate_memory":
        return {
          icon: <DatabaseIcon className="size-6 text-purple-500" />,
          title: t("integrateMemoryTitle"),
          desc: t("integrateMemoryDesc"),
          action: (
            <Button onClick={() => router.push(`/sage/${sage.token}/memory`)}>
              {t("integrateMemoryButton")}
              <ArrowRightIcon className="size-4" />
            </Button>
          ),
        };
      case "fill_gaps":
        return {
          icon: <AlertTriangleIcon className="size-6 text-yellow-500" />,
          title: t("fillGapsTitle"),
          desc: t("fillGapsDesc"),
          action: (
            <ConfirmDialog
              title={t("confirmStartInterviewTitle")}
              description={t("confirmStartInterviewDesc")}
              onConfirm={handleStartInterview}
            >
              <Button disabled={isRequesting}>
                <MicIcon className="size-4" />
                {t("startInterviewButton")}
              </Button>
            </ConfirmDialog>
          ),
        };
      case "analyze_chats":
        return {
          icon: <MessageSquareIcon className="size-6 text-blue-500" />,
          title: t("analyzeChatsTitle"),
          desc: t("analyzeChatsDesc"),
          action: (
            <ConfirmDialog
              title={t("confirmAnalyzeTitle")}
              description={t("confirmAnalyzeDesc")}
              onConfirm={handleAnalyze}
            >
              <Button disabled={isRequesting} variant="secondary">
                <SparklesIcon className="size-4" />
                {t("analyzeChatsButton")}
              </Button>
            </ConfirmDialog>
          ),
        };
      case "share":
      default:
        return {
          icon: <Share2Icon className="size-6 text-green-500" />,
          title: t("shareTitle"),
          desc: t("shareDesc"),
          action: (
            <SageShareButton sageToken={sage.token}>
              <Button variant="default">
                <Share2Icon className="size-4" />
                {t("shareButton")}
              </Button>
            </SageShareButton>
          ),
        };
    }
  };

  const content = renderContent();

  return (
    <>
      <div className="mx-4 sm:mx-6 mt-6 p-6 rounded-xl bg-linear-to-br from-background to-muted/50 border shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex gap-4">
            <div className="mt-1 p-2 bg-background rounded-lg border shadow-xs shrink-0">
              {content.icon}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg tracking-tight">{content.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xl text-pretty">{content.desc}</p>
            </div>
          </div>
          <div className="shrink-0">{content.action}</div>
        </div>
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
              currentSourceCount={stats.sourcesTotal}
              maxSources={30}
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
