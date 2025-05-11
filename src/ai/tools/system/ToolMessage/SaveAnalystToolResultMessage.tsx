import { SaveAnalystToolResult } from "@/ai/tools/system/saveAnalyst";
import { ToolInvocation } from "ai";
import { FC } from "react";

export const SaveAnalystToolResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: SaveAnalystToolResult;
  };
}> = ({ toolInvocation }) => {
  // const { result: { analystId } } = toolInvocation;
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      📝 {toolInvocation.args.topic}
      {/* <Link href={`/analyst/${analystId}`} target="_blank" className="text-blue-500">
        点击查看研究主题
      </Link>
      <span className="ml-4 text-muted-foreground">这个功能还在开发中...</span> */}
    </div>
  );
};
