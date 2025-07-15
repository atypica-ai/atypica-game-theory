import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { fetchStudyFeedback, submitStudyFeedback } from "../actions";

interface StudyFeedbackProps {
  studyUserChatId: number;
  onFeedbackSubmitted?: () => void;
  className?: string;
}

type FeedbackRating = "useful" | "not_useful";

interface FeedbackData {
  rating: FeedbackRating | null;
}

export function StudyFeedback({
  studyUserChatId,
  onFeedbackSubmitted,
  className,
}: StudyFeedbackProps) {
  const t = useTranslations("StudyPage.Feedback");
  const [feedback, setFeedback] = useState<FeedbackData>({ rating: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing feedback on mount
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const result = await fetchStudyFeedback(studyUserChatId);
        if (result.success && result.data) {
          setFeedback({ rating: result.data.rating });
        }
      } catch (error) {
        console.error("Failed to load feedback:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFeedback();
  }, [studyUserChatId]);

  const handleRatingSelect = async (rating: FeedbackRating) => {
    setFeedback({ rating });
    setJustSubmitted(false);

    // Auto-submit immediately
    setIsSubmitting(true);
    try {
      const result = await submitStudyFeedback(studyUserChatId, {
        rating,
      });

      if (result.success) {
        setJustSubmitted(true);
        onFeedbackSubmitted?.();
        // Hide thank you message after 2 seconds
        setTimeout(() => setJustSubmitted(false), 2000);
      } else {
        console.error("Failed to submit feedback:", result.message);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null; // or a subtle loading state
  }

  return (
    <Card
      className={cn(
        "py-3 px-8 border-blue-200 bg-blue-50/30 dark:border-blue-200/40 dark:bg-blue-950/10 gap-3",
        className,
      )}
    >
      <div className="text-center text-sm font-medium text-foreground/80">{t("title")}</div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Button
          variant={feedback.rating === "useful" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          disabled={isSubmitting}
          onClick={() => handleRatingSelect("useful")}
        >
          <ThumbsUpIcon className="size-3" />
          {t("useful")}
        </Button>
        <Button
          variant={feedback.rating === "not_useful" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          disabled={isSubmitting}
          onClick={() => handleRatingSelect("not_useful")}
        >
          <ThumbsDownIcon className="size-3" />
          {t("notUseful")}
        </Button>
      </div>
      {/* Show feedback status */}
      {isSubmitting && (
        <div className="text-center text-xs text-muted-foreground">{t("submitting")}</div>
      )}
      {justSubmitted && (
        <div className="flex items-center justify-center gap-1 text-center text-xs text-green-600">
          <CheckIcon className="size-3" />
          <span>{t("thankYou")}</span>
        </div>
      )}
    </Card>
  );
}
