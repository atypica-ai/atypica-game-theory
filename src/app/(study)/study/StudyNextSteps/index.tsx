"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LightbulbIcon, MicIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { generateRecommendedQuestionsAction } from "./actions";

export function StudyNextSteps({
  studyUserChatId,
  className,
}: {
  studyUserChatId: number;
  className?: string;
}) {
  const t = useTranslations("StudyPage.NextSteps");
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadQuestions = async (forceRegenerate = false) => {
    setIsLoading(true);
    try {
      const result = await generateRecommendedQuestionsAction(studyUserChatId, forceRegenerate);
      if (result.success) {
        setQuestions(result.data.questions);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions(false); // Initial load uses cache
  }, [studyUserChatId]);

  const handleGeneratePodcast = () => {
    console.log("Generate podcast for study:", studyUserChatId);
    // TODO: Implement podcast generation
  };

  const handleStartNewResearch = (question: string) => {
    console.log("Start new research with question:", question);
    // TODO: Implement new research creation
  };

  const handleRefreshQuestions = async () => {
    setIsRefreshing(true);
    await loadQuestions(true); // Force regenerate when clicking refresh
    setIsRefreshing(false);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="size-1 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground font-medium">{t("title")}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-accent/50"
          onClick={handleRefreshQuestions}
          disabled={isRefreshing}
        >
          <RefreshCwIcon
            className={cn("size-3 text-muted-foreground", isRefreshing && "animate-spin")}
          />
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
        {/* Podcast Button */}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 h-9 px-3 border border-border/50 hover:border-border hover:bg-accent/50"
          onClick={handleGeneratePodcast}
        >
          <MicIcon className="size-3.5" />
          <span className="text-sm">{t("generatePodcast")}</span>
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
              <span className="text-sm">{t("generating")}</span>
            </Button>
          </>
        ) : (
          questions.map((question, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-9 px-3 border border-border/50 hover:border-border hover:bg-accent/50 max-w-md"
              onClick={() => handleStartNewResearch(question)}
            >
              <LightbulbIcon className="size-3.5 flex-shrink-0" />
              <span className="text-sm truncate">{question}</span>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
