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
import { BooleanField, ChoiceField, TextField, RatingField } from "./RequestInteractionForm/fields";

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
  const dimensions = result?.dimensions || [];
  const image = result?.image;
  const formFields = result?.formFields || [];

  // Debug: Log to console
  console.log("SelectQuestionToolMessage rendered", {
    toolInvocation,
    result,
    formFields,
  });

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
    if (questionType === "rating") {
      if (typeof answer !== "string") return false;
      try {
        const ratingAnswers = JSON.parse(answer);
        if (typeof ratingAnswers !== "object" || ratingAnswers === null) return false;
        // Check if all dimensions have a score
        return dimensions.every((dim) => 
          ratingAnswers[dim] !== undefined && 
          typeof ratingAnswers[dim] === "number" && 
          ratingAnswers[dim] >= 1 && 
          ratingAnswers[dim] <= 5
        );
      } catch {
        return false;
      }
    }
    return false;
  }, [answer, questionType, dimensions]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isAnswerValid() || !addToolResult) return;

    setIsSubmitting(true);
    try {
      // Format answer text based on question type
      let answerText: string;
      if (questionType === "rating" && typeof answer === "string") {
        try {
          const ratingAnswers = JSON.parse(answer);
          // Format as: "维度1: 3分, 维度2: 4分"
          answerText = Object.entries(ratingAnswers)
            .map(([dim, score]) => `${dim}: ${score}分`)
            .join(", ");
        } catch {
          answerText = answer;
        }
      } else {
        answerText = Array.isArray(answer) ? answer.join(", ") : answer;
      }

      await addToolResult({
        tool: InterviewToolName.selectQuestion,
        toolCallId: toolInvocation.toolCallId,
        output: {
          questionIndex: result?.questionIndex || 0,
          questionText,
          questionType,
          options,
          dimensions,
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
    dimensions,
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

      case "rating":
        return (
          <RatingField
            field={field}
            fieldValue={typeof answer === "string" ? answer : ""}
            isCompleted={isCompleted}
            isRequired={true}
            dimensions={dimensions}
            onUpdate={(fieldId, value) => setAnswer(value as string)}
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
            src={proxiedObjectCdnUrl({
              name: image.name,
              objectUrl: image.objectUrl,
              mimeType: image.mimeType,
            })}
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
            <span>已完成</span>
          </div>
        )}
      </div>
    </div>
  );
};
