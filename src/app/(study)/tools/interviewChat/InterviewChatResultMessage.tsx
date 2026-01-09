import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { ToolUIPart } from "ai";
import { Streamdown } from "streamdown";

export const InterviewChatResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.interviewChat>>,
    { state: "output-available" }
  >;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <Streamdown>{"📝 " + toolInvocation.output.plainText}</Streamdown>
    </div>
  );
};
