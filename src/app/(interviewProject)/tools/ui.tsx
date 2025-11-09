import { RequestInteractionFormToolMessage } from "@/app/(interviewProject)/components/RequestInteractionForm";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { getToolName } from "ai";
import { InterviewToolName, TAddInterviewUIToolResult } from "./types";

export const InterviewToolUIPartDisplay = ({
  toolUIPart,
  addToolResult,
}: {
  toolUIPart: TInterviewMessageWithTool["parts"][number];
  addToolResult?: TAddInterviewUIToolResult;
}) => {
  switch (toolUIPart.type) {
    case `tool-${InterviewToolName.requestInteractionForm}`:
      return (
        <RequestInteractionFormToolMessage
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
        />
      );
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
