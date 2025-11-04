import { RequestInteractionFormToolMessage } from "@/app/(interviewProject)/components/RequestInteractionFormToolMessage";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { getToolName } from "ai";
import { InterviewToolName } from "./types";

export const InterviewToolUIPartDisplay = ({
  toolUIPart,
}: {
  toolUIPart: TInterviewMessageWithTool["parts"][number];
}) => {
  switch (toolUIPart.type) {
    case `tool-${InterviewToolName.requestInteractionForm}`:
      return <RequestInteractionFormToolMessage toolInvocation={toolUIPart} />;
    case `tool-${InterviewToolName.endInterview}`:
      return (
        <div className="font-mono text-xs text-muted-foreground">
          exec {getToolName(toolUIPart)}
        </div>
      );
    default:
      return null;
  }
};
