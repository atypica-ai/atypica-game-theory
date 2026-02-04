"use client";

import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { useFormatContent } from "@/app/api/format-content/useFormatContent";
import { ToolUIPart } from "ai";
import { ClipboardListIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export const PlanStudyResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.planStudy>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.PlanStudyResultMessage");
  const { replay } = useStudyContext();

  // If replay mode, don't generate new content (use cache only)
  // If not replay mode, generate new content (live mode)
  const {
    formattedHtml,
    isLoading: isFormatting,
    formatContent,
  } = useFormatContent({
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
    <div className="p-3 text-foreground bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardListIcon className="size-4 shrink-0" />
        <div className="font-semibold text-sm">{t("title")}</div>
      </div>

      <div className="text-xs">
        {isFormatting && (
          <div className="flex items-center gap-2 text-blue-600 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <LoaderIcon className="animate-spin" size={14} />
            <span>{t("formatting")}</span>
          </div>
        )}

        {formattedHtml ? (
          <div
            className="formatted-study-plan prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : (
          !isFormatting && (
            <div className="whitespace-pre-wrap p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
              {toolInvocation.output.plainText}
            </div>
          )
        )}
      </div>
    </div>
  );
};
