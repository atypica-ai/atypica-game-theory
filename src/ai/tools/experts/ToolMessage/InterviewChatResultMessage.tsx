import { ToolName, UIToolConfigs } from "@/ai/tools/types";
import { ToolUIPart } from "ai";

export const InterviewChatResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<UIToolConfigs, ToolName.interviewChat>>,
    { state: "output-available" }
  >;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs whitespace-pre-wrap">
      📝 {toolInvocation.output.plainText}
    </div>
  );
};
