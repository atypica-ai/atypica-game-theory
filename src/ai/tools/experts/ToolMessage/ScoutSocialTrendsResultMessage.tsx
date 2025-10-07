import { StudyUITools, ToolName } from "@/ai/tools/types";
import { Markdown } from "@/components/markdown";
import { ToolUIPart } from "ai";

export const ScoutSocialTrendsResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.scoutSocialTrends>>,
    { state: "output-available" }
  >;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs whitespace-pre-wrap">
      <Markdown>{toolInvocation.output.summary}</Markdown>
    </div>
  );
};
