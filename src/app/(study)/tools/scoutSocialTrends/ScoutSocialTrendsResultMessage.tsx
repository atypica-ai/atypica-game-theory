"use client";

import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { useFormatContent } from "@/app/api/format-content/useFormatContent";
import { ToolUIPart } from "ai";
import { LoaderIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export const ScoutSocialTrendsResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.scoutSocialTrends>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.ScoutSocialTrendsResultMessage");
  const { replay } = useStudyContext();

  // Format the output as HTML
  const {
    formattedHtml,
    isLoading: isFormatting,
    formatContent,
  } = useFormatContent({
    live: !replay,
  });

  useEffect(() => {
    const summary = toolInvocation.output.summary;
    if (summary) {
      formatContent(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.toolCallId]);

  // Platform stats display
  const stats = toolInvocation.output.stats;
  const platformCount = stats ? Object.keys(stats).length : 0;
  const totalSearches = stats ? Object.values(stats).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="p-3 text-foreground bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      {/* Header with stats */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SearchIcon className="size-4 shrink-0 text-blue-600" />
          <div>
            <div className="font-semibold text-sm">{t("title")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {toolInvocation.input.description}
            </div>
          </div>
        </div>

        {stats && (
          <div className="flex gap-3 text-xs shrink-0">
            <div className="text-center">
              <div className="font-bold text-blue-600">{platformCount}</div>
              <div className="text-muted-foreground">{t("platforms")}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">{totalSearches}</div>
              <div className="text-muted-foreground">{t("searches")}</div>
            </div>
          </div>
        )}
      </div>

      {/* Platform coverage badges */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(stats).map(([platform, count]) => (
            <span
              key={platform}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
            >
              {platform}
              <span className="font-semibold">×{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Formatted HTML Content */}
      <div className="text-xs">
        {isFormatting && (
          <div className="flex items-center gap-2 text-blue-600 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <LoaderIcon className="animate-spin" size={14} />
            <span>{t("formatting")}</span>
          </div>
        )}

        {formattedHtml ? (
          <div
            className="formatted-social-trends prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : (
          !isFormatting && (
            // Fallback: show plain text if formatting hasn't started or failed
            <div className="whitespace-pre-wrap p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
              {toolInvocation.output.summary}
            </div>
          )
        )}
      </div>
    </div>
  );
};
