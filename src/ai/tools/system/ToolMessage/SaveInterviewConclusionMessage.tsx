import { StudyUITools, ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ToolUIPart } from "ai";
import { FC } from "react";

export const SaveInterviewConclusionMessage: FC<{
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.saveInterviewConclusion>>,
    { state: "output-available" }
  >;
}> = ({ toolInvocation }) => {
  return (
    <ChatMessage<TStudyMessageWithTool>
      nickname="Conclusion"
      message={{
        role: "system",
        parts: [{ type: "text", text: toolInvocation.input.conclusion }],
      }}
      renderToolUIPart={() => <></>}
    ></ChatMessage>
  );
};
