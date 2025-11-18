import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useState } from "react";
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

  // Get otherOption configuration from field, or use defaults
  const otherOptionConfig = field.otherOption;
  // If otherOption is not explicitly configured, default to disabled
  // If configured, respect the enabled flag
  const otherOptionEnabled = otherOptionConfig?.enabled === true;
  const OTHER_OPTION_KEY = otherOptionConfig?.label || "其他";
  const otherOptionPlaceholder = otherOptionConfig?.placeholder || t("otherInputPlaceholder");
  const otherOptionRequired = otherOptionConfig?.required || false;

  const [otherInputValue, setOtherInputValue] = useState("");
  const [isOtherOptionSelected, setIsOtherOptionSelected] = useState(false);

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

  // Add "其他" option to the list only if enabled
  const optionsWithOther = otherOptionEnabled
    ? [...(field.options || []), OTHER_OPTION_KEY]
    : field.options || [];

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

  // Handle "其他" option selection
  const handleOtherOptionClick = () => {
    if (isCompleted || !field.id) return;

    // Toggle the "其他" option selection state
    const newState = !isOtherOptionSelected;
    setIsOtherOptionSelected(newState);

    if (newState) {
      // Select "其他"
      if (isSingleChoice) {
        onSelectSingle(field.id, OTHER_OPTION_KEY);
      } else {
        onToggleMultiple(field.id, OTHER_OPTION_KEY);
      }
      setOtherInputValue(""); // Reset input value
    } else {
      // Deselect "其他"
      if (isSingleChoice) {
        onSelectSingle(field.id, ""); // Clear selection
      } else {
        onToggleMultiple(field.id, OTHER_OPTION_KEY); // Remove from selection
      }
      setOtherInputValue("");
    }
  };

  // Handle "其他" input change and update field value
  const handleOtherInputChange = (value: string) => {
    setOtherInputValue(value);
    if (!field.id) return;

    // Keep the "其他" option selected state
    if (!isOtherOptionSelected) {
      setIsOtherOptionSelected(true);
    }

    const otherValue = value.trim() ? `其他：${value}` : OTHER_OPTION_KEY;

    if (isSingleChoice) {
      onSelectSingle(field.id, otherValue);
    } else {
      // For multiple choice, we need to update the value properly
      // Remove old "其他" entries and add the new one
      if (Array.isArray(fieldValue)) {
        // This is a bit tricky - we need to toggle it off then on with new value
        // For now, just update with the new value directly
        onSelectSingle(field.id, otherValue);
      }
    }
  };

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
        {optionsWithOther.map((option, index) => {
          const isOther = option === OTHER_OPTION_KEY;
          const isSelected = isSingleChoice
            ? isOther
              ? isOtherOptionSelected
              : fieldValue === option
            : Array.isArray(fieldValue) && option
              ? isOther
                ? isOtherOptionSelected
                : fieldValue.includes(option)
              : fieldValue === option;

          return (
            <div key={index} className="space-y-2">
              <Button
                variant="outline"
                data-selected={isSelected}
                onClick={
                  isCompleted
                    ? undefined
                    : () => {
                        if (!field.id || !option) return;
                        if (isOther) {
                          handleOtherOptionClick();
                        } else {
                          // Deselect "其他" if selecting another option in single choice
                          if (isSingleChoice && isOtherOptionSelected) {
                            setIsOtherOptionSelected(false);
                            setOtherInputValue("");
                          }

                          if (isSingleChoice) {
                            onSelectSingle(field.id, option);
                          } else {
                            onToggleMultiple(field.id, option);
                          }
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

              {/* Show input field when "其他" is selected */}
              {isOther && isOtherOptionSelected && !isCompleted && (
                <Input
                  type="text"
                  placeholder={otherOptionPlaceholder}
                  value={otherInputValue}
                  onChange={(e) => handleOtherInputChange(e.target.value)}
                  className="w-full"
                  autoFocus
                  required={otherOptionRequired}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
