"use client";

import { getQuestionData } from "@/app/(interviewProject)/actions";
import type { TAddInterviewUIToolResult } from "@/app/(interviewProject)/tools/types";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { ChatMessageAttachment } from "@/prisma/client";
import { ToolUIPart } from "ai";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BooleanField, ChoiceField, TextField } from "./RequestInteractionForm/fields";

interface SelectQuestionToolMessageProps {
  toolInvocation: ToolUIPart<Pick<TInterviewUITools, InterviewToolName.selectQuestion>>;
  addToolResult?: TAddInterviewUIToolResult;
  interviewSessionId: number;
}

export const SelectQuestionToolMessage: FC<SelectQuestionToolMessageProps> = ({
  toolInvocation,
  addToolResult,
  interviewSessionId,
}) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");

  // Form state - single answer field
  const [answer, setAnswer] = useState<string | string[]>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionData, setQuestionData] = useState<{
    questionIndex: number;
    questionText: string;
    questionType: "open" | "single-choice" | "multiple-choice";
    options?: string[];
    image?: ChatMessageAttachment;
    formFields?: Array<{
      id: string;
      label: string;
      type: "text" | "choice" | "boolean";
      options?: string[];
      multipleChoice?: boolean;
    }>;
    optionsMetadata?: Array<{ text: string; endInterview?: boolean }>;
  } | null>(null);

  // Fetch question data when tool is invoked
  useEffect(() => {
    const fetchQuestionData = async () => {
      if (!toolInvocation.input || !interviewSessionId) return;

      const questionIndex =
        typeof toolInvocation.input.questionIndex === "string"
          ? parseInt(toolInvocation.input.questionIndex, 10)
          : toolInvocation.input.questionIndex;

      // Type narrowing for TypeScript
      if (typeof questionIndex !== "number" || !interviewSessionId) return;

      // Start loading first, then reset data (prevents flash of error state)
      setIsLoadingQuestion(true);

      try {
        const result = await getQuestionData({ interviewSessionId, questionIndex });
        if (!result.success) {
          throw result;
        }
        setQuestionData(result.data);
      } catch (error) {
        console.error("Failed to load question:", error);
        toast.error("Failed to load question");
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    fetchQuestionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.input?.questionIndex, interviewSessionId]);

  // Extract question details from fetched data (not from toolInvocation.output anymore)
  const result = questionData;
  const questionText = result?.questionText || "";
  const questionType = result?.questionType || "open";
  const options = useMemo(() => result?.options || [], [result?.options]);
  const image = result?.image;
  const formFields = useMemo(() => result?.formFields || [], [result?.formFields]);

  // Use AI-provided optionsMetadata if available, otherwise fall back to server data
  const aiProvidedMetadata = toolInvocation.input?.optionsMetadata;
  const optionsMetadata = useMemo(() => {
    // Filter and normalize AI-provided metadata
    if (aiProvidedMetadata && Array.isArray(aiProvidedMetadata)) {
      const normalized: Array<{ text: string; endInterview?: boolean }> = [];
      for (const item of aiProvidedMetadata) {
        if (item && item.text) {
          normalized.push({
            text: item.text,
            endInterview: item.endInterview,
          });
        }
      }
      return normalized;
    }
    return result?.optionsMetadata || [];
  }, [aiProvidedMetadata, result?.optionsMetadata]);

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

  // Check if user selected an option that ends interview
  const checkIfShouldEndInterview = useCallback(() => {
    if (questionType !== "single-choice" && questionType !== "multiple-choice") {
      return false;
    }

    // Get the selected option(s)
    const selectedOptions = Array.isArray(answer) ? answer : [answer];

    // Check if any selected option has endInterview flag
    return optionsMetadata.some((opt) => opt.endInterview && selectedOptions.includes(opt.text));
  }, [questionType, answer, optionsMetadata]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isAnswerValid() || !addToolResult) return;

    setIsSubmitting(true);
    try {
      // Check if should end interview
      const shouldEndInterview = checkIfShouldEndInterview();

      // Format plainText for AI model
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;
      let plainText = `Question ${result?.questionIndex || 0}: ${questionText}\n`;
      plainText += `User's answer: ${answerText}\n`;
      if (shouldEndInterview) {
        plainText +=
          "\n⚠️ IMPORTANT: The user selected an option that ends the interview. You MUST immediately call the endInterview tool now. Do not ask any more questions.";
      }

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
          optionsMetadata,
          userAnswer: answer,
          shouldEndInterview,
          plainText,
        },
      });
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setIsSubmitting(false);
    }
  }, [
    isAnswerValid,
    addToolResult,
    answer,
    questionType,
    toolInvocation.toolCallId,
    result,
    questionText,
    options,
    image,
    formFields,
    optionsMetadata,
    checkIfShouldEndInterview,
  ]);

  // Render field based on question type
  const renderField = () => {
    if (formFields.length === 0) {
      return null;
    }

    const field = formFields[0]; // We only have one field for selectQuestion

    // In completed state, use userAnswer from output; otherwise use local state
    const fieldValue =
      isCompleted && toolInvocation.state === "output-available"
        ? toolInvocation.output.userAnswer
        : answer;

    switch (field.type) {
      case "text":
        return (
          <TextField
            field={field}
            fieldValue={typeof fieldValue === "string" ? fieldValue : ""}
            isCompleted={isCompleted}
            isRequired={true}
            onUpdate={(fieldId, value) => setAnswer(value as string)}
          />
        );

      case "choice":
        return (
          <ChoiceField
            field={field}
            fieldValue={fieldValue}
            isCompleted={isCompleted}
            isRequired={true}
            isBasicInfoForm={false}
            isSingleChoice={!field.multipleChoice}
            onSelectSingle={(fieldId, value) => setAnswer(value)}
            onToggleMultiple={(fieldId, option) => {
              const currentValues = Array.isArray(answer) ? answer : [];
              const newValues = currentValues.includes(option)
                ? currentValues.filter((v) => v !== option)
                : [...currentValues, option];
              setAnswer(newValues);
            }}
            optionsMetadata={optionsMetadata}
          />
        );

      case "boolean":
        return (
          <BooleanField
            field={field}
            fieldValue={typeof fieldValue === "boolean" ? fieldValue : fieldValue === "true"}
            isCompleted={isCompleted}
            isRequired={true}
            onUpdate={(fieldId, value) => setAnswer(value?.toString() || "")}
          />
        );

      default:
        return null;
    }
  };

  // Show loading state while fetching question data
  if (isLoadingQuestion) {
    return <LoadingPulse />;
  }

  // Return nothing if still initializing (data not loaded yet but no error)
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
                <Check className="mr-2 h-4 w-4" />
                {t("submit")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
