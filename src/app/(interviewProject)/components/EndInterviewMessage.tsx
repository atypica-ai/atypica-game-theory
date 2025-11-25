"use client";

import { InterviewToolName } from "@/app/(interviewProject)/tools/types";
import type { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { LoadingPulse } from "@/components/LoadingPulse";
import { useTranslations } from "next-intl";
import { FC } from "react";

interface InterviewCompleteMessageProps {
  toolInvocation: TInterviewMessageWithTool["parts"][number] & {
    type: `tool-${InterviewToolName.endInterview}`;
  };
}

export const EndInterviewMessage: FC<InterviewCompleteMessageProps> = ({ toolInvocation }) => {
  const t = useTranslations("InterviewProject.endInterview");
  const isCompleted = toolInvocation.state === "output-available";

  return (
    <div className="space-y-4 text-zinc-600 dark:text-zinc-400 pt-2">
      {!isCompleted ? (
        <>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>{t("processing")}</span>
            <LoadingPulse />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
          <span>{t("completed")}</span>
        </div>
      )}
    </div>
  );
};
