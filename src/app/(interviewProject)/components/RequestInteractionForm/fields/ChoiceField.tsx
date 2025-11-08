import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ChoiceFieldProps } from "../types";
import { MULTIPLE_CHOICE_STYLE } from "../config";

export const ChoiceField: FC<ChoiceFieldProps> = ({
  field,
  fieldValue,
  isCompleted,
  isRequired,
  isBasicInfoForm,
  isSingleChoice,
  onSelectSingle,
  onToggleMultiple,
  onSubmit,
  choiceFieldsCount,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  const isInterviewQuestion = !isBasicInfoForm;

  // For multi-choice questions, check if at least one option is selected
  const hasSelection = isSingleChoice
    ? !!fieldValue
    : Array.isArray(fieldValue) && fieldValue.length > 0;

  // Determine grid layout
  const gridLayout = (() => {
    if (isBasicInfoForm) {
      // Basic info form always uses 2 columns
      return "grid-cols-2";
    }
    if (isSingleChoice) {
      // Single-choice: always 1 column (vertical)
      return "grid-cols-1";
    }
    // Multi-choice: depends on style configuration
    // Style A: 1 column (vertical, consistent with single-choice)
    // Style B: 2 columns (grid, original prototype design)
    return MULTIPLE_CHOICE_STYLE === "A" ? "grid-cols-1" : "grid-cols-2";
  })();

  // All choice options use outline variant
  // Selected state is shown by black background (custom class) + checkmark
  const getButtonVariant = (): "outline" => "outline";

  const handleSubmit = () => {
    if (hasSelection) {
      onSubmit();
    } else {
      toast.error(t("selectAtLeastOne"));
    }
  };

  return (
    <div key={field.id} className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300">
          {field.label}
          {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
        </label>
        {!isCompleted && !isSingleChoice && (
          <Badge variant="secondary" className="text-xs">
            {t("multipleChoice")}
          </Badge>
        )}
      </div>

      <div className={cn("grid gap-2", gridLayout)}>
        {field.options?.map((option, index) => {
          const isSelected = isSingleChoice
            ? fieldValue === option
            : Array.isArray(fieldValue)
              ? fieldValue.includes(option)
              : fieldValue === option;

          return (
            <Button
              variant={getButtonVariant()}
              key={index}
              data-selected={isSelected}
              onClick={
                isCompleted
                  ? undefined
                  : () => {
                      if (isSingleChoice) {
                        onSelectSingle(field.id, option);
                      } else {
                        onToggleMultiple(field.id, option);
                      }
                    }
              }
              className={cn(
                "flex items-center justify-between",
                "data-[selected=true]:bg-black data-[selected=true]:text-white data-[selected=true]:border-black",
                "data-[selected=true]:hover:bg-black/90",
              )}
            >
              {option}
              {isSelected && <Check className="h-4 w-4" />}
            </Button>
          );
        })}
      </div>

      {/* For interview questions with single choice field, show OK button below options */}
      {/* If multiple choice fields exist, show unified OK button at bottom instead */}
      {isInterviewQuestion && !isCompleted && choiceFieldsCount === 1 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!hasSelection}
            className="min-w-24 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("ok")}
          </Button>
        </div>
      )}
    </div>
  );
};
