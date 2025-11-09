import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { FC } from "react";
import type { FieldProps } from "../types";

export const TextField: FC<FieldProps> = ({
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
          {(fieldValue as string) || t("notFilled")}
        </div>
      ) : (
        <Input
          placeholder={field.placeholder}
          value={(fieldValue as string) || ""}
          onChange={(e) => field.id && onUpdate(field.id, e.target.value)}
        />
      )}
    </div>
  );
};
