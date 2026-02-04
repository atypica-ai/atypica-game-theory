"use client";

import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { useFormatContent } from "@/app/api/format-content/useFormatContent";
import { ToolUIPart } from "ai";
import { LoaderIcon, SearchIcon } from "lucide-react";
import { useEffect } from "react";

export const DeepResearchResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.deepResearch>>,
    { state: "output-available" }
  >;
}) => {
  const { formattedHtml, isLoading: isFormatting, formatContent } = useFormatContent();

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
        <SearchIcon className="size-4 shrink-0" />
        <div className="font-semibold text-sm">深度研究</div>
      </div>

      <div className="text-xs">
        {isFormatting && (
          <div className="flex items-center gap-2 text-blue-600 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <LoaderIcon className="animate-spin" size={14} />
            <span>正在格式化研究结果...</span>
          </div>
        )}

        {formattedHtml ? (
          <div
            className="formatted-deep-research prose prose-sm max-w-none dark:prose-invert"
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
