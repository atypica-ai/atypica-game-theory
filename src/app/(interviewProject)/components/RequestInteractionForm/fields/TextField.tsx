import { FC } from "react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import type { FieldProps } from "../types";

export const TextField: FC<FieldProps> = ({ field, fieldValue, isCompleted, isRequired, onUpdate }) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  return (
    <div key={field.id} className="space-y-3">
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300">
        {field.label}
        {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
      </label>
      {isCompleted ? (
        <div className="p-3 bg-zinc-50 rounded-lg border text-sm text-zinc-700">
          {(fieldValue as string) || t("notFilled")}
        </div>
      ) : (
        <Input
          placeholder={field.placeholder}
          value={(fieldValue as string) || ""}
          onChange={(e) => onUpdate(field.id, e.target.value)}
          className="border focus:border-primary focus:ring-primary"
        />
      )}
    </div>
  );
};
