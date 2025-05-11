import { ChatMessage } from "@/components/chat/ChatMessage";
import { ToolInvocation } from "ai";
import { FC } from "react";

export const SaveInterviewConclusionMessage: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  return (
    <ChatMessage
      nickname="Conclusion"
      role="system"
      content={toolInvocation.args.conclusion}
    ></ChatMessage>
  );
};
