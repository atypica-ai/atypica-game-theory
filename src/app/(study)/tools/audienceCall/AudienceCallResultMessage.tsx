"use client";

import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { useFormatContent } from "@/app/api/format-content";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ToolUIPart } from "ai";
import { BrainIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export const AudienceCallResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.audienceCall>>,
    { state: "output-available" }
  >;
}) => {
  const tReasoning = useTranslations("Components.ReasoningThinkingResultMessage");
  const t = useTranslations("Components.AudienceCallResultMessage");
  const { replay } = useStudyContext();

  const { formattedHtml, isLoading: isFormatting, formatContent } = useFormatContent({
    live: !replay,
  });

  useEffect(() => {
    const plainText = toolInvocation.output.plainText;
    if (plainText) {
      formatContent(plainText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.toolCallId]);

  return (
    <div className="p-2 text-foreground/70 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mt-2 mb-3 flex flex-rows items-start justify-start gap-2">
        <BrainIcon className="mx-1 size-4 shrink-0" />
        <div className="flex-1 overflow-hidden">
          <span className="font-medium">{tReasoning("deepThinking")}: </span>
          {toolInvocation.input.question}
        </div>
      </div>
      <div className="flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId} className="size-6" />
        <div className="flex-1 overflow-hidden space-y-2">
          {toolInvocation.output.reasoning && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 p-2 rounded">
              {toolInvocation.output.reasoning}
            </div>
          )}

          {/* Formatted HTML Content */}
          <div className="text-xs">
            {isFormatting && (
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <LoaderIcon className="animate-spin" size={14} />
                <span>{t("formatting")}</span>
              </div>
            )}

            {formattedHtml ? (
              <div
                className="formatted-audience-feedback prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: formattedHtml }}
              />
            ) : (
              !isFormatting && (
                // Fallback: show plain text if formatting hasn't started or failed
                <div className="whitespace-pre-wrap">{toolInvocation.output.text}</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
