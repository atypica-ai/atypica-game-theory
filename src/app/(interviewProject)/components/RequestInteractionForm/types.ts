import type { RequestInteractionFormToolInput } from "@/app/(interviewProject)/tools/types";
import { DeepPartial } from "ai";

export type FieldValue = string | string[] | boolean | undefined;

export type FormResponses = Record<string, FieldValue>;

export interface FieldProps {
  field: DeepPartial<RequestInteractionFormToolInput["fields"][number]>; // 支持 streaming 中的表单部分渲染
  fieldValue: FieldValue;
  isCompleted: boolean;
  isRequired: boolean;
  onUpdate: (fieldId: string, value: FieldValue) => void;
}

export interface ChoiceFieldProps {
  field: DeepPartial<RequestInteractionFormToolInput["fields"][number]>; // 支持 streaming 中的表单部分渲染
  fieldValue: FieldValue;
  isCompleted: boolean;
  isRequired: boolean;
  isBasicInfoForm: boolean;
  isSingleChoice: boolean;
  onSelectSingle: (fieldId: string, option: string | string[]) => void;
  onToggleMultiple: (fieldId: string, option: string) => void;
  onSubmit?: () => void;
  choiceFieldsCount?: number;
}
