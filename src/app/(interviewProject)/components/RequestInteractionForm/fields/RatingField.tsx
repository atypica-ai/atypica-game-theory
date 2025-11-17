import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { FC } from "react";
import type { FieldProps } from "../types";

export interface RatingFieldProps extends FieldProps {
  dimensions: string[];
}

export const RatingField: FC<RatingFieldProps> = ({
  field,
  fieldValue,
  isCompleted,
  isRequired,
  dimensions,
  onUpdate,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Parse fieldValue as rating answers object: { "维度1": 3, "维度2": 4, ... }
  const ratingAnswers = (() => {
    if (!fieldValue || typeof fieldValue !== "string") return {};
    try {
      const parsed = JSON.parse(fieldValue);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  })();

  const handleRatingChange = (dimension: string, score: number) => {
    if (!field.id || isCompleted) return;

    const newAnswers = {
      ...ratingAnswers,
      [dimension]: score,
    };

    // Update field value as JSON string
    onUpdate(field.id, JSON.stringify(newAnswers));
  };

  const getScoreForDimension = (dimension: string): number | undefined => {
    return ratingAnswers[dimension];
  };

  const isAllDimensionsRated = () => {
    return dimensions.every((dim) => getScoreForDimension(dim) !== undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          {field.label}
          {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
        </label>
        {!isCompleted && !isAllDimensionsRated() && (
          <span className="text-xs text-muted-foreground">
            {t("ratingHint")}
          </span>
        )}
      </div>

      {isCompleted ? (
        <div className="space-y-2">
          {dimensions.map((dimension) => {
            const score = getScoreForDimension(dimension);
            return (
              <div key={dimension} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm font-medium">{dimension}</span>
                <span className="text-sm text-muted-foreground">
                  {score !== undefined ? `${score} 分` : t("notSelected")}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-4 text-sm font-medium">维度</th>
                  <th className="text-center p-3 text-sm font-medium">1</th>
                  <th className="text-center p-3 text-sm font-medium">2</th>
                  <th className="text-center p-3 text-sm font-medium">3</th>
                  <th className="text-center p-3 text-sm font-medium">4</th>
                  <th className="text-center p-3 text-sm font-medium">5</th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dimension, index) => {
                  const currentScore = getScoreForDimension(dimension);
                  const radioName = `${field.id}-${dimension}`;
                  return (
                    <tr
                      key={dimension}
                      className={cn(
                        "border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                    >
                      <td className="p-4 text-sm font-medium">{dimension}</td>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <td key={score} className="p-3 text-center">
                          <label
                            htmlFor={`${field.id}-${dimension}-${score}`}
                            className="relative inline-flex flex-col items-center cursor-pointer group"
                          >
                            <input
                              type="radio"
                              name={radioName}
                              id={`${field.id}-${dimension}-${score}`}
                              value={score}
                              checked={currentScore === score}
                              onChange={() => handleRatingChange(dimension, score)}
                              disabled={isCompleted}
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all",
                                currentScore === score
                                  ? "border-primary"
                                  : "border-muted-foreground/40 group-hover:border-primary/60"
                              )}
                            />
                            {currentScore === score && (
                              <div className="absolute top-7 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                            )}
                          </label>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

