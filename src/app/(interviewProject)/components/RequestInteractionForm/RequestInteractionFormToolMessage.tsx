import type {
  RequestInteractionFormToolInput,
  TAddInterviewUIToolResult,
} from "@/app/(interviewProject)/tools/types";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { DeepPartial, ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { FC, useCallback } from "react";
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

  return (
    <div className="w-md max-w-full mx-auto">
      <div className="space-y-6">
        {toolInvocation.state === "input-available" ||
        toolInvocation.state === "input-streaming" ? (
          !fields || fields.length === 0 ? (
            <div className="flex items-center justify-center">
              <LoadingPulse />
            </div>
          ) : (
            <div className="space-y-6">
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

              {/* Render all fields */}
              {fields.map((field) => renderField(field))}
            </div>
          )
        ) : isFormCompleted ? (
          <div className="space-y-6">
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

            {/* Render all fields in read-only mode */}
            {fields?.map((field) => renderField(field))}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <LoadingPulse />
          </div>
        )}

        {/* Submit button */}
        {!isFormCompleted && toolInvocation.state === "input-available" && (
          <div className="pt-4 border-t">
            <Button onClick={submitForm} disabled={!isFormValid} className="w-full">
              {t("submitForm")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
