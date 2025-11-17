"use client";

import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import type { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useEffect, useState } from "react";

interface InterviewCompleteMessageProps {
  toolInvocation: TInterviewMessageWithTool["parts"][number] & {
    type: `tool-${InterviewToolName.endInterview}`;
  };
}

export const InterviewCompleteMessage: FC<InterviewCompleteMessageProps> = ({ toolInvocation }) => {
  const t = useTranslations("InterviewProject.interviewComplete");
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setShowAnimation(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const isCompleted = toolInvocation.state === "output-available";

  return (
    <div
      className={`
        my-8 mx-auto max-w-2xl
        transition-all duration-700 ease-out
        ${showAnimation ? "opacity-100 scale-100" : "opacity-0 scale-95"}
      `}
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 shadow-xl">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-10" />

        {/* Content */}
        <div className="relative z-10 space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle2 className="h-20 w-20 text-primary animate-in zoom-in duration-500" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary/60 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              {t("title")}
            </h2>
            <p className="text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {t("subtitle")}
            </p>
          </div>

          {/* Message */}
          <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <p className="text-base text-foreground/80 leading-relaxed">{t("thankYouMessage")}</p>
            <p className="text-sm text-muted-foreground">{t("processingMessage")}</p>
          </div>

          {/* Processing indicator */}
          {!isCompleted && (
            <div className="flex items-center justify-center gap-2 pt-4 animate-in fade-in duration-700 delay-500">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
            </div>
          )}

          {/* Completion status */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2 pt-4 text-sm font-medium text-primary animate-in fade-in duration-700 delay-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("completed")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
