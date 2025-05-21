import { InterviewChatResult } from "@/ai/tools/types";
import { ToolInvocation } from "ai";
import { FC } from "react";

export const InterviewChatResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: InterviewChatResult;
  };
}> = ({ toolInvocation }) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs whitespace-pre-wrap">
      📝 {toolInvocation.result.plainText}
    </div>
  );
};
