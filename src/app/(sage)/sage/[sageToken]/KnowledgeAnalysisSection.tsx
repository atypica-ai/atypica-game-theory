"use client";
import type { SageExtra } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MessageCircle, RefreshCw, Target } from "lucide-react";
import { useTranslations } from "next-intl";

export function KnowledgeAnalysisSection({
  analysis,
  onAnalyze,
  isAnalyzing,
  onCreateInterview,
  isCreatingInterview,
}: {
  analysis: NonNullable<SageExtra["knowledgeAnalysis"]>;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onCreateInterview: () => void;
  isCreatingInterview: boolean;
}) {
  const t = useTranslations("Sage.detail");

  const overallScore = analysis.overallScore ?? 0;
  const dimensions = analysis.dimensions ?? [];
  const knowledgeGaps = analysis.knowledgeGaps ?? [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getLevelColor = (level: string) => {
    if (level === "high") return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (level === "medium")
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("knowledgeAnalysis")}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("overallCompleteness")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onAnalyze} disabled={isAnalyzing}>
            <RefreshCw className={cn("size-4", isAnalyzing && "animate-spin")} />
            {t("reAnalyze")}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("overallScore")}
              </span>
              <span className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
                {overallScore}
              </span>
            </div>
            <Progress value={overallScore} className="h-3" />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t("knowledgeDimensions")}
          </h3>
          <div className="space-y-4">
            {dimensions.map((dimension, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {dimension.name}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        getLevelColor(dimension.level)
                      )}
                    >
                      {dimension.level}
                    </span>
                  </div>
                  <span className={cn("text-sm font-semibold", getScoreColor(dimension.score))}>
                    {dimension.score}
                  </span>
                </div>
                <Progress value={dimension.score} className="h-2" />
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{dimension.assessment}</p>
                {dimension.improvementSuggestions && dimension.improvementSuggestions.length > 0 && (
                  <ul className="text-xs text-zinc-500 dark:text-zinc-500 list-disc list-inside space-y-1">
                    {dimension.improvementSuggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {knowledgeGaps.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t("knowledgeGaps")}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("knowledgeGapsDescription")}
              </p>
            </div>
            <Button onClick={onCreateInterview} disabled={isCreatingInterview}>
              <MessageCircle className="size-4" />
              {t("startInterview")}
            </Button>
          </div>
          <div className="space-y-4">
            {knowledgeGaps.map((gap, index) => (
              <div
                key={index}
                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-md space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-zinc-500 mt-0.5" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {gap.area}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      gap.severity === "critical"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        : gap.severity === "important"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    {gap.severity}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{gap.description}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  <span className="font-medium">{t("impact")}:</span> {gap.impact}
                </p>
                {gap.suggestedQuestions && gap.suggestedQuestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t("suggestedQuestions")}:
                    </p>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside space-y-1">
                      {gap.suggestedQuestions.map((question, idx) => (
                        <li key={idx}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
