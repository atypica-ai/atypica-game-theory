import { useCallback, useMemo, useState } from "react";
import type { FormResponses, FieldValue } from "./types";
import type { RequestInteractionFormToolInput } from "@/app/(interviewProject)/tools/types";
import { REQUIRED_FIELD_IDS, SINGLE_CHOICE_FIELD_IDS } from "./config";

export function useFormState() {
  const [formResponses, setFormResponses] = useState<FormResponses>({});

  const updateFieldValue = useCallback((fieldId: string, value: FieldValue) => {
    setFormResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const toggleChoiceOption = useCallback((fieldId: string, option: string) => {
    setFormResponses((prev) => {
      const current = prev[fieldId];
      if (Array.isArray(current)) {
        if (current.includes(option)) {
          return { ...prev, [fieldId]: current.filter((o) => o !== option) };
        } else {
          return { ...prev, [fieldId]: [...current, option] };
        }
      } else {
        return { ...prev, [fieldId]: [option] };
      }
    });
  }, []);

  const selectSingleChoice = useCallback((fieldId: string, option: string) => {
    setFormResponses((prev) => ({
      ...prev,
      [fieldId]: option,
    }));
  }, []);

  const setBooleanValue = useCallback((fieldId: string, value: boolean) => {
    setFormResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  return {
    formResponses,
    updateFieldValue,
    toggleChoiceOption,
    selectSingleChoice,
    setBooleanValue,
  };
}

export function useFormValidation(
  toolInvocation: { state: string; input?: RequestInteractionFormToolInput | null | unknown },
  formResponses: FormResponses,
) {
  return useMemo(() => {
    if (toolInvocation.state !== "input-available" || !toolInvocation.input) {
      return false;
    }

    // Check all required fields are filled
    for (const field of toolInvocation.input.fields) {
      if (REQUIRED_FIELD_IDS.has(field.id)) {
        const value = formResponses[field.id];

        // Required field is empty
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return false;
        }

        // For multi-choice fields (array), check if at least one option is selected
        if (
          field.type === "choice" &&
          !SINGLE_CHOICE_FIELD_IDS.has(field.id) &&
          Array.isArray(value) &&
          value.length === 0
        ) {
          return false;
        }
      }
    }
    return true;
  }, [toolInvocation.state, toolInvocation.input, formResponses]);
}

export function useFormType(toolInvocation: { input?: RequestInteractionFormToolInput | null | unknown }) {
  return useMemo(() => {
    const input = toolInvocation.input as RequestInteractionFormToolInput | null | undefined;
    const fieldIds = input?.fields?.map((f) => f?.id) || [];
    // Basic info form has these specific field IDs
    return fieldIds.includes("name") && fieldIds.includes("gender");
  }, [toolInvocation.input]);
}

export function useChoiceFieldsCount(
  isBasicInfoForm: boolean,
  toolInvocation: { input?: RequestInteractionFormToolInput | null | unknown },
) {
  return useMemo(() => {
    if (isBasicInfoForm || !toolInvocation.input?.fields) return 0;
    return toolInvocation.input.fields.filter((f) => f.type === "choice").length;
  }, [isBasicInfoForm, toolInvocation.input]);
}
