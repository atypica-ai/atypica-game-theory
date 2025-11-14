"use client";

import type { TAddInterviewUIToolResult } from "@/app/(interviewProject)/tools/types";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { ToolUIPart } from "ai";
import { Check } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FC, useCallback, useState } from "react";
import { toast } from "sonner";
import { BooleanField, ChoiceField, TextField } from "./RequestInteractionForm/fields";

interface SelectQuestionToolMessageProps {
  toolInvocation: ToolUIPart<Pick<TInterviewUITools, InterviewToolName.selectQuestion>>;
  addToolResult?: TAddInterviewUIToolResult;
}

export const SelectQuestionToolMessage: FC<SelectQuestionToolMessageProps> = ({
  toolInvocation,
  addToolResult,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Form state - single answer field
  const [answer, setAnswer] = useState<string | string[]>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract question details from tool result
  const result = toolInvocation.output;
  const questionText = result?.questionText || "";
  const questionType = result?.questionType || "open";
  const options = result?.options || [];
  const image = result?.image;
  const formFields = result?.formFields || [];

  // Check if form has been submitted
  const isCompleted = toolInvocation.state === "output-available";

  // Validate answer
  const isAnswerValid = useCallback(() => {
    if (questionType === "open") {
      return typeof answer === "string" && answer.trim().length > 0;
    }
    if (questionType === "single-choice") {
      return typeof answer === "string" && answer.length > 0;
    }
    if (questionType === "multiple-choice") {
      return Array.isArray(answer) && answer.length > 0;
    }
    return false;
  }, [answer, questionType]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isAnswerValid() || !addToolResult) return;

    setIsSubmitting(true);
    try {
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

      await addToolResult({
        tool: InterviewToolName.selectQuestion,
        toolCallId: toolInvocation.toolCallId,
        output: {
          questionIndex: result?.questionIndex || 0,
          questionText,
          questionType,
          options,
          image,
          formFields,
        },
      });

      toast.success(t("submitSuccess"));
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast.error(t("submitError"));
      setIsSubmitting(false);
    }
  }, [
    isAnswerValid,
    addToolResult,
    answer,
    t,
    toolInvocation.toolCallId,
    result,
    questionText,
    questionType,
    options,
    image,
    formFields,
  ]);

  // Render field based on question type
  const renderField = () => {
    if (formFields.length === 0) return null;

    const field = formFields[0]; // We only have one field for selectQuestion

    switch (field.type) {
      case "text":
        return (
          <TextField
            field={field}
            value={typeof answer === "string" ? answer : ""}
            onChange={(value) => setAnswer(value)}
            disabled={isCompleted || isSubmitting}
          />
        );

      case "choice":
        return (
          <ChoiceField
            field={field}
            value={answer}
            onChange={(value) => setAnswer(value)}
            onToggle={(option) => {
              if (field.multipleChoice) {
                // Multiple choice
                const currentValues = Array.isArray(answer) ? answer : [];
                const newValues = currentValues.includes(option)
                  ? currentValues.filter((v) => v !== option)
                  : [...currentValues, option];
                setAnswer(newValues);
              } else {
                // Single choice
                setAnswer(option);
              }
            }}
            disabled={isCompleted || isSubmitting}
          />
        );

      case "boolean":
        return (
          <BooleanField
            field={field}
            value={answer === "true"}
            onChange={(value) => setAnswer(value.toString())}
            disabled={isCompleted || isSubmitting}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-4 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      {/* Question Image */}
      {image && (
        <div className="relative aspect-video w-full overflow-hidden rounded-md">
          <Image
            src={proxiedObjectCdnUrl(image.objectUrl)}
            alt={questionText}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Question and Form */}
      <div className="space-y-4">
        {renderField()}

        {/* Submit Button */}
        {!isCompleted && (
          <Button
            onClick={handleSubmit}
            disabled={!isAnswerValid() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <LoadingPulse />
                {t("submitting")}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("submit")}
              </>
            )}
          </Button>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" />
            <span>{t("completed")}</span>
          </div>
        )}
      </div>
    </div>
  );
};
