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
      otherOption?: {
        enabled: boolean;
        label: string;
        placeholder?: string;
        required?: boolean;
      };
    }>;
    optionsMetadata?: Array<{ text: string; endInterview?: boolean }>;
  } | null>(null);

  // Fetch question data when tool is invoked
  useEffect(() => {
    const fetchQuestionData = async () => {
      if (!toolInvocation.input || questionData || !interviewSessionId) return; // Don't fetch if already loaded or no session ID

      const questionIndex =
        typeof toolInvocation.input.questionIndex === "string"
          ? parseInt(toolInvocation.input.questionIndex, 10)
          : toolInvocation.input.questionIndex;

      // Type narrowing for TypeScript
      if (typeof questionIndex !== "number" || !interviewSessionId) return;

      setIsLoadingQuestion(true);
      try {
        const result = await getQuestionData({ interviewSessionId, questionIndex });
        if (result.success) {
          setQuestionData(result.data);
        } else {
          console.error("Failed to fetch question data:", result.message);
          toast.error(result.message || "Failed to load question");
        }
      } catch (error) {
        console.error("Error fetching question data:", error);
        toast.error("Failed to load question");
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    fetchQuestionData();
  }, [toolInvocation.input, interviewSessionId, questionData]);

  // Extract question details from fetched data (not from toolInvocation.output anymore)
  const result = questionData;
  const questionText = result?.questionText || "";
  const questionType = result?.questionType || "open";
  const options = useMemo(() => result?.options || [], [result?.options]);
  const image = result?.image;
  const formFields = useMemo(() => result?.formFields || [], [result?.formFields]);
  const optionsMetadata = useMemo(() => result?.optionsMetadata || [], [result?.optionsMetadata]);

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
    questionType,
    t,
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

    switch (field.type) {
      case "text":
        return (
          <TextField
            field={field}
            fieldValue={typeof answer === "string" ? answer : ""}
            isCompleted={isCompleted}
            isRequired={true}
            onUpdate={(fieldId, value) => setAnswer(value as string)}
          />
        );

      case "choice":
        return (
          <ChoiceField
            field={field}
            fieldValue={answer}
            isCompleted={isCompleted}
            isRequired={true}
            isBasicInfoForm={false}
            isSingleChoice={!field.multipleChoice}
            onSelectSingle={(fieldId, option) => setAnswer(option)}
            onToggleMultiple={(fieldId, option) => {
              const currentValues = Array.isArray(answer) ? answer : [];
              const newValues = currentValues.includes(option)
                ? currentValues.filter((v) => v !== option)
                : [...currentValues, option];
              setAnswer(newValues);
            }}
          />
        );

      case "boolean":
        return (
          <BooleanField
            field={field}
            fieldValue={answer === "true"}
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
    return (
      <div className="my-4 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <LoadingPulse />
          <span>Loading question...</span>
        </div>
      </div>
    );
  }

  // Show error if no question data loaded
  if (!questionData) {
    return (
      <div className="my-4 space-y-4 rounded-lg border border-destructive bg-card p-4 shadow-sm">
        <div className="text-center text-destructive">Failed to load question</div>
      </div>
    );
  }

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
