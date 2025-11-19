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
  optionsMetadata,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Track which option is selected that needs input, and its input value
  const [selectedNeedsInputOption, setSelectedNeedsInputOption] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Helper to check if an option needs input based on optionsMetadata
  const optionNeedsInput = (optionText: string): boolean => {
    if (!optionsMetadata) return false;
    const meta = optionsMetadata.find((m) => m.text === optionText);
    return meta?.needsInput === true;
  };

  // Get placeholder text for input (use default)
  const inputPlaceholder = t("otherInputPlaceholder");

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

  // Use options directly from field (no longer adding extra "other" option)
  const options = field.options || [];

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

  // Handle option click - check if it needs input
  const handleOptionClick = (option: string) => {
    if (isCompleted || !field.id) return;

    const needsInput = optionNeedsInput(option);

    if (isSingleChoice) {
      if (needsInput) {
        // Select the option and show input field
        setSelectedNeedsInputOption(option);
        setInputValue("");
        onSelectSingle(field.id, option);
      } else {
        // Regular option - clear any input state
        setSelectedNeedsInputOption(null);
        setInputValue("");
        onSelectSingle(field.id, option);
      }
    } else {
      // Multiple choice
      if (needsInput) {
        // Toggle the needsInput option
        if (selectedNeedsInputOption === option) {
          // Deselect
          setSelectedNeedsInputOption(null);
          setInputValue("");
          onToggleMultiple(field.id, option);
        } else {
          // Select
          setSelectedNeedsInputOption(option);
          setInputValue("");
          onToggleMultiple(field.id, option);
        }
      } else {
        // Regular option
        onToggleMultiple(field.id, option);
      }
    }
  };

  // Handle input change for needsInput option
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!field.id || !selectedNeedsInputOption) return;

    // Format: "选项文本：用户输入"
    const formattedValue = value.trim()
      ? `${selectedNeedsInputOption}：${value}`
      : selectedNeedsInputOption;

    if (isSingleChoice) {
      onSelectSingle(field.id, formattedValue);
    } else {
      // For multiple choice, update the array
      const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
      // Remove old values for this option
      const filteredValues = currentValues.filter(
        (v) =>
          v !== selectedNeedsInputOption && !v.startsWith(`${selectedNeedsInputOption}：`),
      );
      // Add the new formatted value
      const newValues = [...filteredValues, formattedValue];
      onSelectSingle(field.id, newValues);
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
        {options.map((option, index) => {
          if (!option) return null;
          const needsInput = optionNeedsInput(option);
          const isSelected = isSingleChoice
            ? needsInput
              ? selectedNeedsInputOption === option ||
                (typeof fieldValue === "string" && fieldValue.startsWith(`${option}：`))
              : fieldValue === option
            : Array.isArray(fieldValue) && option
              ? needsInput
                ? selectedNeedsInputOption === option ||
                  fieldValue.some((v) => v === option || v.startsWith(`${option}：`))
                : fieldValue.includes(option)
              : fieldValue === option;

          return (
            <div key={index} className="space-y-2">
              <Button
                variant="outline"
                data-selected={isSelected}
                onClick={isCompleted ? undefined : () => handleOptionClick(option)}
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

              {/* Show input field when this option needs input and is selected */}
              {needsInput && selectedNeedsInputOption === option && !isCompleted && (
                <Input
                  type="text"
                  placeholder={inputPlaceholder}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
