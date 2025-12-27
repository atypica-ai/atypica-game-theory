import { ToolName } from "@/ai/tools/types";
import { ToolUIPart } from "ai";
import { DiscussionChatResult, DiscussionChatToolInput } from "./types";

export const DiscussionChatResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    // ToolUIPart<Pick<StudyUITools, ToolName.discussionChat>>,
    ToolUIPart<{
      [ToolName.discussionChat]: { input: DiscussionChatToolInput; output: DiscussionChatResult };
    }>,
    { state: "output-available" }
  >;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs whitespace-pre-wrap">
      📝 {toolInvocation.output.plainText}
    </div>
  );
};
