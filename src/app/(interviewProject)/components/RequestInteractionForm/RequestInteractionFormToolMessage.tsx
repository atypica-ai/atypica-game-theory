import { FC, useCallback } from "react";
import { ToolUIPart } from "ai";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import type { RequestInteractionFormToolInput } from "@/app/(interviewProject)/tools/types";
import { TextField, BooleanField, ChoiceField } from "./fields";
import { useFormState, useFormValidation, useFormType, useChoiceFieldsCount } from "./hooks";
import { SINGLE_CHOICE_FIELD_IDS, REQUIRED_FIELD_IDS } from "./config";

interface RequestInteractionFormToolMessageProps {
  toolInvocation: ToolUIPart<Pick<TInterviewUITools, InterviewToolName.requestInteractionForm>>;
  addToolResult?: <TOOL extends keyof TInterviewUITools>(
    params:
      | {
          state?: "output-available";
          tool: TOOL;
          toolCallId: string;
          output: TInterviewUITools[TOOL]["output"];
          errorText?: never;
        }
      | {
          state: "output-error";
          tool: TOOL;
          toolCallId: string;
          output?: never;
          errorText: string;
        },
  ) => Promise<void>;
}

export const RequestInteractionFormToolMessage: FC<RequestInteractionFormToolMessageProps> = ({
  toolInvocation,
  addToolResult,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Form state management
  const { formResponses, updateFieldValue, toggleChoiceOption, selectSingleChoice, setBooleanValue } =
    useFormState();

  // Form validation and type detection
  const isFormValid = useFormValidation(
    { state: toolInvocation.state, input: toolInvocation.input },
    formResponses,
  );
  const isBasicInfoForm = useFormType({ input: toolInvocation.input });
  const choiceFieldsCount = useChoiceFieldsCount(isBasicInfoForm, { input: toolInvocation.input });

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
  }, [toolInvocation.state, toolInvocation.toolCallId, addToolResult, formResponses, isFormValid, t]);

  const isFormCompleted = toolInvocation.state === "output-available";
  const resultData =
    toolInvocation.state === "output-available" ? toolInvocation.output.formResponses : undefined;

  const renderField = (field: RequestInteractionFormToolInput["fields"][number]) => {
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
            onSubmit={submitForm}
            choiceFieldsCount={choiceFieldsCount}
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-lg sm:text-xl font-bold leading-tight text-center">
          {toolInvocation.input?.prologue || t("defaultPrologue")}
        </div>
      </div>

      <div className="space-y-6">
        {toolInvocation.state === "input-available" && (
          <div className="space-y-6">{toolInvocation.input.fields.map(renderField)}</div>
        )}

        {/* Show submit button for basic info form */}
        {!isFormCompleted && isBasicInfoForm && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={submitForm} disabled={!isFormValid}>
              {t("submitForm")}
            </Button>
          </div>
        )}

        {/* Show unified OK button for interview questions with multiple choice fields */}
        {!isFormCompleted && !isBasicInfoForm && choiceFieldsCount > 1 && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => {
                if (isFormValid) {
                  submitForm();
                } else {
                  toast.error(t("requiredFieldsError"));
                }
              }}
              disabled={!isFormValid}
              className="min-w-24 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("ok")}
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
