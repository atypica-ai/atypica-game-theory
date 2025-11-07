import type { RequestInteractionFormToolInput } from "@/app/(interviewProject)/tools/types";

export type FieldValue = string | string[] | boolean | undefined;

export type FormResponses = Record<string, FieldValue>;

export interface FieldProps {
  field: RequestInteractionFormToolInput["fields"][number];
  fieldValue: FieldValue;
  isCompleted: boolean;
  isRequired: boolean;
  onUpdate: (fieldId: string, value: FieldValue) => void;
}

export interface ChoiceFieldProps {
  field: RequestInteractionFormToolInput["fields"][number];
  fieldValue: FieldValue;
  isCompleted: boolean;
  isRequired: boolean;
  isBasicInfoForm: boolean;
  isSingleChoice: boolean;
  onSelectSingle: (fieldId: string, option: string) => void;
  onToggleMultiple: (fieldId: string, option: string) => void;
  onSubmit: () => void;
  choiceFieldsCount: number;
}
