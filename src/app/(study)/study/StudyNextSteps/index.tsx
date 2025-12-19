import { NewStudyButton } from "@/app/(newStudy)/components/NewStudyInputBox";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileTextIcon, LightbulbIcon, MicIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "./ActionButton";
import { generateRecommendedQuestionsAction } from "./actions";

export function StudyNextSteps({
  studyUserChatToken,
  sendMessage,
  className,
}: {
  studyUserChatToken: string;
  sendMessage: (message: { text: string }) => void;
  className?: string;
}) {
  const t = useTranslations("StudyPage.NextSteps");
  const { artifacts } = useStudyContext();
  const [questions, setQuestions] = useState<Array<{ title: string; brief: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Handle generate podcast button click - use sendMessage to let study agent handle it
  const handleGeneratePodcast = useCallback(() => {
    if (sendMessage) {
      // Get user's locale to send message in their language
      const locale = document.documentElement.lang || "en-US";
      const message =
        locale === "zh-CN"
          ? "请为这个研究生成一个播客"
          : "Please generate a podcast for this study";
      sendMessage({ text: message });
    }
  }, [sendMessage]);

  // Handle generate report button click - use sendMessage to let study agent handle it
  const handleGenerateReport = useCallback(() => {
    if (sendMessage) {
      // Get user's locale to send message in their language
      const locale = document.documentElement.lang || "en-US";
      const message =
        locale === "zh-CN" ? "请为这个研究生成一个报告" : "Please generate a report for this study";
      sendMessage({ text: message });
    }
  }, [sendMessage]);

  // New display logic:
  // - Show podcast button ONLY if report exists but podcast doesn't
  // - Show report button ONLY if podcast exists but report doesn't
  // - Don't show either if both exist or both don't exist
  const hasReport = artifacts.reportCount !== null && artifacts.reportCount > 0;
  const hasPodcast = artifacts.podcastCount !== null && artifacts.podcastCount > 0;

  const showPodcastButton = hasReport && !hasPodcast;
  const showReportButton = hasPodcast && !hasReport;
  const showAnyButton = showPodcastButton || showReportButton;

  // Don't show if study is not available and no buttons to show
  if (!isStudyAvailableForNextSteps && !showAnyButton && !isLoading) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Artifacts Generation Section */}
      {showAnyButton && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="size-1 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground font-medium">{t("artifactsTitle")}</span>
          </div>
          <div className="flex flex-col items-start justify-start gap-2.5">
            {showPodcastButton && (
              <ActionButton
                icon={MicIcon}
                text={t("generatePodcast")}
                onClick={handleGeneratePodcast}
              />
            )}
            {showReportButton && (
              <ActionButton
                icon={FileTextIcon}
                text={t("generateReport")}
                onClick={handleGenerateReport}
              />
            )}
          </div>
        </div>
      )}

      {/* Recommended Research Questions Section */}
      {isStudyAvailableForNextSteps && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="size-1 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                {t("questionsTitle")}
              </span>
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
          <div className="flex flex-col items-start justify-start gap-2.5">
            {isLoading ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-9 px-3 border border-border/50 opacity-50"
                  disabled
                >
                  <LightbulbIcon className="size-3.5 shrink-0" />
                  <span className="text-xs">{t("generating")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-9 border border-border/50 opacity-50"
                  disabled
                >
                  <LightbulbIcon className="size-3.5 shrink-0" />
                  <span className="text-xs">{t("generating")}</span>
                </Button>
              </>
            ) : (
              questions.map((question, index) => (
                <NewStudyButton
                  key={index}
                  initialBrief={question.brief}
                  referenceUserChatTokens={[studyUserChatToken]}
                  fixedStudyType="general"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "border border-border/50 hover:border-border hover:bg-accent/50",
                      "max-w-full overflow-hidden",
                      "h-auto min-h-9 py-1 block whitespace-break-spaces text-left space-x-2",
                    )}
                  >
                    <LightbulbIcon className="size-3.5 shrink-0 inline" />
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-xs font-normal shrink-0 inline"
                    >
                      {t("newStudyBadge")}
                    </Badge>
                    <span className="text-xs inline">{question.title}</span>
                  </Button>
                </NewStudyButton>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
