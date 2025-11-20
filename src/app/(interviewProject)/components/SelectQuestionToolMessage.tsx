"use client";

import type { QuestionData, TAddInterviewUIToolResult } from "@/app/(interviewProject)/tools/types";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { ToolUIPart } from "ai";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { FC, useCallback, useMemo, useState } from "react";
import { ChoiceField, TextField } from "./RequestInteractionForm/fields";

interface SelectQuestionToolMessageProps {
  toolInvocation: ToolUIPart<Pick<TInterviewUITools, InterviewToolName.selectQuestion>>;
  addToolResult?: TAddInterviewUIToolResult;
  questions: QuestionData[];
}

export const SelectQuestionToolMessage: FC<SelectQuestionToolMessageProps> = ({
  toolInvocation,
  addToolResult,
  questions,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Form state - single answer field
  const [answer, setAnswer] = useState<string | string[]>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get question index from tool input 1 based
  const questionIndex = useMemo(() => {
    const idx = toolInvocation.input?.questionIndex;
    const parsedIdx = typeof idx === "string" ? parseInt(idx, 10) : (idx ?? 1);
    return parsedIdx;
  }, [toolInvocation.input?.questionIndex]);

  // Get question data from questions array (client-side, from sessionExtra)
  const questionData = useMemo(() => {
    const question = questions[questionIndex - 1]; // questionIndex is 1 based
    if (!question) return null;

    const questionType = question.questionType || "open";

    // Process options to separate text and metadata
    const optionsArray: string[] = [];
    if (question.options && question.options.length > 0) {
      question.options.forEach((opt) => {
        if (typeof opt === "string") {
          optionsArray.push(opt);
        } else {
          optionsArray.push(opt.text);
        }
      });
    }

    return {
      questionIndex,
      questionText: question.text,
      questionType,
      options: optionsArray,
      image: question.image,
      hint: question.hint,
    };
  }, [questions, questionIndex]);

  const questionText = questionData?.questionText || "";
  const questionType = questionData?.questionType || "open";
  const image = questionData?.image;
  const options = questionData?.options || [];
  const questionHint = questionData?.hint || "";

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
      const plainText = `[Question ${questionIndex}] ${questionText}\n[User's Answer] ${answerText}\n`;
      await addToolResult({
        tool: InterviewToolName.selectQuestion,
        toolCallId: toolInvocation.toolCallId,
        output: {
          question: {
            text: questionText,
            type: questionType,
            hint: questionHint,
          },
          answer: answer, // Keep original type: string for open, string[] for choices
          plainText,
        },
      });
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAnswerValid,
    addToolResult,
    answer,
    toolInvocation.toolCallId,
    questionIndex,
    questionText,
    questionType,
    questionHint,
  ]);

  // Render field based on question type (dynamically generated)
  const renderField = () => {
    // In completed state, use answer from output; otherwise use local state
    let fieldValue: string | string[];
    if (isCompleted && toolInvocation.state === "output-available") {
      // answer is already in correct format (string | string[])
      fieldValue = toolInvocation.output.answer;
    } else {
      fieldValue = answer;
    }

    // Generate field based on questionType
    if (questionType === "open") {
      return (
        <TextField
          field={{
            id: "answer",
            label: questionText,
            type: "text",
          }}
          fieldValue={typeof fieldValue === "string" ? fieldValue : ""}
          isCompleted={isCompleted}
          isRequired={true}
          onUpdate={(fieldId, value) => setAnswer(value as string)}
        />
      );
    }

    // Single-choice or multiple-choice
    if (questionType === "single-choice" || questionType === "multiple-choice") {
      return (
        <ChoiceField
          field={{
            id: "answer",
            label: questionText,
            type: "choice",
            options,
            multipleChoice: questionType === "multiple-choice",
          }}
          fieldValue={fieldValue}
          isCompleted={isCompleted}
          isRequired={true}
          isBasicInfoForm={false}
          isSingleChoice={questionType === "single-choice"}
          onSelectSingle={(fieldId, value) => setAnswer(value)}
          onToggleMultiple={(fieldId, option) => {
            const currentValues = Array.isArray(answer) ? answer : [];
            const newValues = currentValues.includes(option)
              ? currentValues.filter((v) => v !== option)
              : [...currentValues, option];
            setAnswer(newValues);
          }}
        />
      );
    }

    return null;
  };

  // Return nothing if question data is not available
  if (!questionData) {
    return null;
  }

  return (
    <div className="w-md max-w-full mx-auto my-4 space-y-4 rounded-lg border p-4">
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
                <Check className="size-4" />
                {t("submit")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
