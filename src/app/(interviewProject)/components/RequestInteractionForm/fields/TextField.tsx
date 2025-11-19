import { Input } from "@/components/ui/input";
import { FC } from "react";
import type { FieldProps } from "../types";

export const TextField: FC<FieldProps> = ({
  field,
  fieldValue,
  isCompleted,
  isRequired,
  onUpdate,
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {field.label}
        {isRequired && !isCompleted && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        placeholder={field.placeholder}
        value={(fieldValue as string) || ""}
        onChange={(e) => field.id && onUpdate(field.id, e.target.value)}
        readOnly={isCompleted}
        className={isCompleted ? "pointer-events-none cursor-default" : ""}
      />
    </div>
  );
};
