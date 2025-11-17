import type {
  RequestInteractionFormToolInput,
  TAddInterviewUIToolResult,
} from "@/app/(interviewProject)/tools/types";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { DeepPartial, ToolUIPart } from "ai";
import { Check } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FC, useCallback, useState } from "react";
import { toast } from "sonner";
import { REQUIRED_FIELD_IDS, SINGLE_CHOICE_FIELD_IDS } from "./config";
import { BooleanField, ChoiceField, TextField } from "./fields";
import { useFormState, useFormType, useFormValidation } from "./hooks";

interface RequestInteractionFormToolMessageProps {
  toolInvocation: ToolUIPart<Pick<TInterviewUITools, InterviewToolName.requestInteractionForm>>;
  addToolResult?: TAddInterviewUIToolResult;
  // <TOOL extends keyof TInterviewUITools>(
  //   params:
  //     | {
  //         state?: "output-available";
  //         tool: TOOL;
  //         toolCallId: string;
  //         output: TInterviewUITools[TOOL]["output"];
  //         errorText?: never;
  //       }
  //     | {
  //         state: "output-error";
  //         tool: TOOL;
  //         toolCallId: string;
  //         output?: never;
  //         errorText: string;
  //       },
  // )
  // => Promise<void>;
}

export const RequestInteractionFormToolMessage: FC<RequestInteractionFormToolMessageProps> = ({
  toolInvocation,
  addToolResult,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Track current field index for step-by-step display
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  // Form state management
  const {
    formResponses,
    updateFieldValue,
    toggleChoiceOption,
    selectSingleChoice,
    setBooleanValue,
  } = useFormState();

  // Form validation and type detection
  const isFormValid = useFormValidation(toolInvocation, formResponses);
  const isBasicInfoForm = useFormType(toolInvocation);
  // const choiceFieldsCount = useChoiceFieldsCount(isBasicInfoForm, toolInvocation);

  // Check if current field is valid
  const isCurrentFieldValid = useCallback(() => {
    const fields = toolInvocation.input?.fields;
    if (!fields || currentFieldIndex >= fields.length) return false;

    const currentField = fields[currentFieldIndex];
    if (!currentField?.id) return false;

    const isRequired = REQUIRED_FIELD_IDS.has(currentField.id);
    const fieldValue = formResponses[currentField.id];

    // If field is required, check if it has a value
    if (isRequired) {
      if (currentField.type === "choice") {
        // For choice fields, check if at least one option is selected
        if (typeof fieldValue === "string") {
          // If value is exactly "其他" without any text, it's invalid
          if (fieldValue === "其他") {
            return false;
          }
          return fieldValue.length > 0;
        }
        if (Array.isArray(fieldValue)) {
          // Check if array has values and if "其他" is selected, it must have text input
          if (fieldValue.length === 0) {
            return false;
          }
          if (fieldValue.includes("其他") && !fieldValue.some((v) => v.startsWith("其他："))) {
            return false;
          }

          // Check minSelections and maxSelections for multiple-choice
          const minSelections = (currentField as { minSelections?: number }).minSelections;
          const maxSelections = (currentField as { maxSelections?: number }).maxSelections;

          if (minSelections && fieldValue.length < minSelections) {
            return false;
          }
          if (maxSelections && fieldValue.length > maxSelections) {
            return false;
          }

          return true;
        }
        return false;
      }
      return fieldValue !== undefined && fieldValue !== "";
    }

    // Optional fields are always valid
    return true;
  }, [toolInvocation.input?.fields, currentFieldIndex, formResponses]);

  // Handle continue to next field
  const handleContinue = useCallback(() => {
    if (!isCurrentFieldValid()) {
      toast.error(t("requiredFieldsError"));
      return;
    }

    const fields = toolInvocation.input?.fields;
    if (fields && currentFieldIndex < fields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  }, [isCurrentFieldValid, currentFieldIndex, toolInvocation.input?.fields, t]);

  // Handle go back to previous field
  const handleBack = useCallback(() => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  }, [currentFieldIndex]);

  const submitForm = useCallback(() => {
    if (toolInvocation.state === "input-available" && addToolResult) {
      // Validate required fields before submission
      if (!isFormValid) {
        toast.error(t("requiredFieldsError"));
        return;
      }

      addToolResult({
        tool: InterviewToolName.requestInteractionForm,
        toolCallId: toolInvocation.toolCallId,
        output: {
          formResponses: formResponses as Record<string, string>,
          plainText: Object.entries(formResponses)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n"),
        },
      });
    }
  }, [
    toolInvocation.state,
    toolInvocation.toolCallId,
    addToolResult,
    formResponses,
    isFormValid,
    t,
  ]);

  const isFormCompleted = toolInvocation.state === "output-available";
  const resultData =
    toolInvocation.state === "output-available" ? toolInvocation.output.formResponses : undefined;

  const renderField = (
    field?: DeepPartial<RequestInteractionFormToolInput["fields"][number]>, // 支持 streaming 中的表单部分渲染
  ) => {
    if (!field?.id || !field.type) {
      return null;
    }
    const fieldValue = isFormCompleted ? resultData?.[field.id] : formResponses[field.id];
    const isRequired = REQUIRED_FIELD_IDS.has(field.id);

    switch (field.type) {
      case "text":
        return (
          <TextField
            key={field.id}
            field={field}
            fieldValue={fieldValue}
            isCompleted={isFormCompleted}
            isRequired={isRequired}
            onUpdate={updateFieldValue}
          />
        );

      case "choice": {
        // In basic info form, use hardcoded single choice fields
        // In interview questions, check the multipleChoice field
        // TESTING: field id containing "test_multi" will be treated as multiple choice
        const isSingleChoice = isBasicInfoForm
          ? SINGLE_CHOICE_FIELD_IDS.has(field.id)
          : field.id.includes("test_multi")
            ? false
            : !field.multipleChoice; // Use the multipleChoice field from AI, default to single choice

        return (
          <ChoiceField
            key={field.id}
            field={field}
            fieldValue={fieldValue}
            isCompleted={isFormCompleted}
            isRequired={isRequired}
            isBasicInfoForm={isBasicInfoForm}
            isSingleChoice={isSingleChoice}
            onSelectSingle={selectSingleChoice}
            onToggleMultiple={toggleChoiceOption}
          />
        );
      }

      case "boolean":
        return (
          <BooleanField
            key={field.id}
            field={field}
            fieldValue={fieldValue}
            isCompleted={isFormCompleted}
            isRequired={isRequired}
            onUpdate={(fieldId, value) => setBooleanValue(fieldId, value as boolean)}
          />
        );

      default:
        return null;
    }
  };

  const fields = toolInvocation.input?.fields;
  const totalFields = fields?.length ?? 0;
  const isLastField = currentFieldIndex === totalFields - 1;
  const currentField = fields?.[currentFieldIndex];

  return (
    <div className="w-full max-w-sm mx-auto">
      {/*
      <div className="mb-6">
        <div className="text-lg sm:text-xl font-bold leading-tight text-center">
          {toolInvocation.input?.prologue}
        </div>
      </div>
      */}

      <div className="space-y-6">
        {(toolInvocation.state === "input-available" ||
          toolInvocation.state === "input-streaming") &&
        currentField ? (
          <div className="space-y-6">
            {/* Show field progress indicator */}
            {totalFields > 1 && (
              <div className="text-sm text-center text-muted-foreground mb-4">
                {currentFieldIndex + 1} / {totalFields}
              </div>
            )}

            {/* Display image if provided */}
            {toolInvocation.input?.image &&
              toolInvocation.input.image.objectUrl &&
              toolInvocation.input.image.name &&
              toolInvocation.input.image.mimeType && (
                <div className="rounded-lg overflow-hidden border">
                  <Image
                    src={proxiedObjectCdnUrl({
                      name: toolInvocation.input.image.name,
                      objectUrl: toolInvocation.input.image.objectUrl,
                      mimeType: toolInvocation.input.image.mimeType,
                    })}
                    alt={toolInvocation.input.image.name}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

            {/* Render only current field */}
            {renderField(currentField)}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <LoadingPulse />
          </div>
        )}

        {/* Show Continue button for non-last fields */}
        {!isFormCompleted && !isLastField && currentField && (
          <div className="flex justify-between pt-4 border-t">
            {currentFieldIndex > 0 && (
              <Button variant="outline" onClick={handleBack} className="min-w-24">
                {t("back")}
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={!isCurrentFieldValid()}
              className="min-w-24 ml-auto"
            >
              {t("continue")}
            </Button>
          </div>
        )}

        {/* Show Submit button for last field or single field forms */}
        {!isFormCompleted && isLastField && currentField && (
          <div className="flex justify-between pt-4 border-t">
            {currentFieldIndex > 0 && (
              <Button variant="outline" onClick={handleBack} className="min-w-24">
                {t("back")}
              </Button>
            )}
            <Button
              onClick={submitForm}
              disabled={!isCurrentFieldValid() || !isFormValid}
              className="min-w-24 ml-auto"
            >
              {t("submitForm")}
            </Button>
          </div>
        )}

        {isFormCompleted && (
          <div className="flex items-center justify-center pt-4 border-t">
            <div className="flex items-center space-x-2 text-primary">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">{t("formSubmitted")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
