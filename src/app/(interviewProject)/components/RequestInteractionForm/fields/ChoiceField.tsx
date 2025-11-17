import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC } from "react";
import { MULTIPLE_CHOICE_STYLE } from "../config";
import type { ChoiceFieldProps } from "../types";

export const ChoiceField: FC<ChoiceFieldProps> = ({
  field,
  fieldValue,
  isCompleted,
  isRequired,
  isBasicInfoForm,
  isSingleChoice,
  onSelectSingle,
  onToggleMultiple,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

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

  const fieldOptions = field.options || [];

  // Validation logic for multiple-choice
  const minSelections = field.minSelections;
  const maxSelections = field.maxSelections;
  const currentSelections = Array.isArray(fieldValue) ? fieldValue.length : 0;

  // Check if selection is valid
  const isSelectionValid = (() => {
    if (isSingleChoice) return true; // Single choice doesn't need validation

    if (minSelections && currentSelections < minSelections) return false;
    if (maxSelections && currentSelections > maxSelections) return false;
    return true;
  })();

  // Generate validation hint text
  const validationHint = (() => {
    if (isSingleChoice || isCompleted) return null;

    if (minSelections && maxSelections) {
      return t("selectRange", { min: minSelections, max: maxSelections });
    }
    if (minSelections) {
      return t("selectAtLeast", { count: minSelections });
    }
    if (maxSelections) {
      return t("selectAtMost", { count: maxSelections });
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          {field.label}
          {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
        </label>
        {!isCompleted && !isSingleChoice && (
          <Badge variant="secondary" className="text-xs">
            {t("multipleChoice")}
          </Badge>
        )}
      </div>

      {/* Validation hint */}
      {validationHint && !isCompleted && (
        <div
          className={cn(
            "text-xs px-2 py-1 rounded",
            isSelectionValid ? "text-muted-foreground" : "text-destructive bg-destructive/10",
          )}
        >
          {validationHint}
          {!isSelectionValid && currentSelections > 0 && (
            <span className="ml-1">(已选 {currentSelections} 个)</span>
          )}
        </div>
      )}

      <div className={cn("grid gap-2", gridLayout)}>
        {fieldOptions.map((option, index) => {
          const isSelected = isSingleChoice
            ? fieldValue === option
            : Array.isArray(fieldValue) && option
              ? fieldValue.includes(option)
              : fieldValue === option;

          return (
            <Button
              key={index}
              variant="outline"
              data-selected={isSelected}
              onClick={
                isCompleted
                  ? undefined
                  : () => {
                      if (!field.id || !option) return;

                      if (isSingleChoice) {
                        onSelectSingle(field.id, option);
                      } else {
                        onToggleMultiple(field.id, option);
                      }
                    }
              }
              className={cn(
                "flex items-center justify-between w-full",
                "data-[selected=true]:bg-primary dark:data-[selected=true]:bg-primary",
                "data-[selected=true]:text-primary-foreground dark:data-[selected=true]:text-primary-foreground",
                "bg-transparent dark:bg-transparent data-[selected=true]:border-transparent",
                "data-[selected=true]:hover:bg-primary/90 dark:data-[selected=true]:hover:bg-primary/90",
              )}
            >
              {option}
              {isSelected && <Check className="size-4" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
