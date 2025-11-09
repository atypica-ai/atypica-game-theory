import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC } from "react";
import type { FieldProps } from "../types";

export const BooleanField: FC<FieldProps> = ({
  field,
  fieldValue,
  isCompleted,
  isRequired,
  onUpdate,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {field.label}
        {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
      </label>
      {isCompleted ? (
        <div className="p-3 rounded-lg border text-sm">
          {fieldValue === true ? t("yes") : fieldValue === false ? t("no") : t("notFilled")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={fieldValue === true ? "default" : "outline"}
            onClick={() => field.id && onUpdate(field.id, true)}
            className="flex items-center justify-between"
          >
            {t("yes")}
            {fieldValue === true && <Check className="h-4 w-4" />}
          </Button>
          <Button
            variant={fieldValue === false ? "default" : "outline"}
            onClick={() => field.id && onUpdate(field.id, false)}
            className="flex items-center justify-between"
          >
            {t("no")}
            {fieldValue === false && <Check className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};
