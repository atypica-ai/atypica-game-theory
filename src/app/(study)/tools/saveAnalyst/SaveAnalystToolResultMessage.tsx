import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { ToolUIPart } from "ai";
import { Streamdown } from "streamdown";

export const SaveAnalystToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.saveAnalyst>>,
    { state: "output-available" }
  >;
}) => {
  // const { result: { analystId } } = toolInvocation;
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <Streamdown mode="static">{"📝 " + toolInvocation.input.topic}</Streamdown>
      {/* <Link href={`/analyst/${analystId}`} target="_blank" className="text-blue-500">
        点击查看研究主题
      </Link>
      <span className="ml-4 text-muted-foreground">这个功能还在开发中...</span> */}
    </div>
  );
};
