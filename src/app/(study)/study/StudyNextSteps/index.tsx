"use client";
import { NewStudyButton } from "@/app/(newStudy)/components/NewStudyInputBox";
import { determineKindAndGeneratePodcastAction } from "@/app/(podcast)/actions";
import { fetchAnalystByStudyUserChatToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LightbulbIcon, Loader2Icon, MicIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { generateRecommendedQuestionsAction } from "./actions";

export function StudyNextSteps({
  studyUserChatToken,
  className,
}: {
  studyUserChatToken: string;
  className?: string;
}) {
  const t = useTranslations("StudyPage.NextSteps");
  const { artifacts } = useStudyContext();
  const [questions, setQuestions] = useState<Array<{ title: string; brief: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const [isStudyAvailableForNextSteps, setIsStudyAvailableForNextSteps] = useState(false);

  const loadQuestions = useCallback(
    async (forceRegenerate = false) => {
      setIsLoading(true);
      try {
        const result = await generateRecommendedQuestionsAction(
          studyUserChatToken,
          forceRegenerate,
        );
        if (!result.success) throw result;
        if (result.data.availableForNextSteps) {
          setIsStudyAvailableForNextSteps(true);
          setQuestions(result.data.questions);
        } else {
          setIsStudyAvailableForNextSteps(false);
        }
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [studyUserChatToken],
  );

  useEffect(() => {
    loadQuestions(false); // Initial load uses cache
  }, [loadQuestions]);

  const handleRefreshQuestions = useCallback(async () => {
    setIsRefreshing(true);
    await loadQuestions(true); // Force regenerate when clicking refresh
    setIsRefreshing(false);
  }, [loadQuestions]);

  // Callback to actually generate the podcast
  const generatePodcast = useCallback(async () => {
    setIsGeneratingPodcast(true);
    try {
      // Get analyst ID from study user chat token
      const analystResult = await fetchAnalystByStudyUserChatToken({ studyUserChatToken });
      if (!analystResult.success) {
        toast.error("Failed to get analyst information");
        setIsGeneratingPodcast(false);
        return;
      }
      // Trigger podcast generation in background
      await determineKindAndGeneratePodcastAction({ analystId: analystResult.data.id });
      toast.success(t("podcastGenerationStarted"));
      // Refresh artifact counts to update badge
      await artifacts.refreshCount();
    } catch (error) {
      console.error("Failed to generate podcast:", error);
      toast.error("Failed to start podcast generation");
    } finally {
      setIsGeneratingPodcast(false);
    }
  }, [studyUserChatToken, t, artifacts]);

  // Handle generate podcast button click
  const handleGeneratePodcast = useCallback(async () => {
    // Check if podcasts already exist
    if (artifacts.podcastCount && artifacts.podcastCount > 0) {
      // Show confirmation dialog
      setShowRegenerateDialog(true);
    } else {
      // No existing podcasts, generate directly
      await generatePodcast();
    }
  }, [artifacts.podcastCount, generatePodcast]);

  // Callback when user confirms regeneration
  const handleConfirmRegenerate = useCallback(async () => {
    setShowRegenerateDialog(false);
    await generatePodcast();
  }, [generatePodcast]);

  // Callback when user cancels regeneration
  const handleCancelRegenerate = useCallback(() => {
    setShowRegenerateDialog(false);
  }, []);

  return isStudyAvailableForNextSteps ? (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="size-1 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground font-medium">{t("title")}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-accent/50 hidden" // 展示隐藏下，目前先不给刷新
          onClick={handleRefreshQuestions}
          disabled={isRefreshing}
        >
          <RefreshCwIcon
            className={cn("size-3 text-muted-foreground", isRefreshing && "animate-spin")}
          />
        </Button>
      </div>

      <div className="flex flex-col items-start justify-start gap-2">
        {/* Podcast Button */}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 h-9 px-3 border border-border/50 hover:border-border hover:bg-accent/50"
          onClick={handleGeneratePodcast}
          disabled={isGeneratingPodcast}
        >
          {isGeneratingPodcast ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <MicIcon className="size-3.5" />
          )}
          <span className="text-xs">
            {isGeneratingPodcast ? t("generating") : t("generatePodcast")}
          </span>
        </Button>
        {/* Recommended Research Questions */}
        {isLoading ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 px-3 border border-border/50 opacity-50"
              disabled
            >
              <LightbulbIcon className="size-3.5 flex-shrink-0" />
              <span className="text-sm">{t("generating")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 px-3 border border-border/50 opacity-50"
              disabled
            >
              <LightbulbIcon className="size-3.5 flex-shrink-0" />
              <span className="text-xs">{t("generating")}</span>
            </Button>
          </>
        ) : (
          questions.map((question, index) => (
            <NewStudyButton
              key={index}
              initialQuestion={question.brief}
              referenceUserChatTokens={[studyUserChatToken]}
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start gap-2 h-9 px-3 border border-border/50 hover:border-border hover:bg-accent/50",
                  "w-full overflow-hidden",
                )}
              >
                <LightbulbIcon className="size-3.5 flex-shrink-0" />
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal flex-shrink-0"
                >
                  {t("newStudyBadge")}
                </Badge>
                <span className="text-xs truncate">{question.title}</span>
              </Button>
            </NewStudyButton>
          ))
        )}
      </div>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("podcastExistsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("podcastExistsMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRegenerate}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              {t("regenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ) : null;
}
