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

  const OTHER_OPTION_KEY = "其他";
  const [otherInputValue, setOtherInputValue] = useState("");

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

  // Add "其他" option to the list
  const optionsWithOther = [...(field.options || []), OTHER_OPTION_KEY];

  // Check if "其他" is selected
  const isOtherSelected = isSingleChoice
    ? fieldValue === OTHER_OPTION_KEY || (typeof fieldValue === "string" && fieldValue.startsWith("其他："))
    : Array.isArray(fieldValue) && fieldValue.some(v => v === OTHER_OPTION_KEY || v.startsWith("其他："));

  // Handle "其他" option selection
  const handleOtherOptionClick = () => {
    if (isCompleted || !field.id) return;

    if (isSingleChoice) {
      onSelectSingle(field.id, OTHER_OPTION_KEY);
    } else {
      onToggleMultiple(field.id, OTHER_OPTION_KEY);
    }
  };

  // Handle "其他" input change and update field value
  const handleOtherInputChange = (value: string) => {
    setOtherInputValue(value);
    if (!field.id) return;

    const otherValue = value.trim() ? `其他：${value}` : OTHER_OPTION_KEY;

    if (isSingleChoice) {
      onSelectSingle(field.id, otherValue);
    } else {
      // For multiple choice, replace the old "其他" entry with new value
      if (Array.isArray(fieldValue)) {
        const filtered = fieldValue.filter(v => v !== OTHER_OPTION_KEY && !v.startsWith("其他："));
        onSelectSingle(field.id, otherValue); // Update through parent
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

      <div className={cn("grid gap-2", gridLayout)}>
        {optionsWithOther.map((option, index) => {
          const isOther = option === OTHER_OPTION_KEY;
          const isSelected = isSingleChoice
            ? isOther
              ? isOtherSelected
              : fieldValue === option
            : Array.isArray(fieldValue) && option
              ? isOther
                ? isOtherSelected
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
              {isOther && isSelected && !isCompleted && (
                <Input
                  type="text"
                  placeholder={t("otherInputPlaceholder")}
                  value={otherInputValue}
                  onChange={(e) => handleOtherInputChange(e.target.value)}
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
