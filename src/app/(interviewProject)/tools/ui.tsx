import { InterviewCompleteMessage } from "@/app/(interviewProject)/components/InterviewCompleteMessage";
import { RequestInteractionFormToolMessage } from "@/app/(interviewProject)/components/RequestInteractionForm";
import { SelectQuestionToolMessage } from "@/app/(interviewProject)/components/SelectQuestionToolMessage";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { InterviewToolName, TAddInterviewUIToolResult } from "./types";

export const InterviewToolUIPartDisplay = ({
  toolUIPart,
  addToolResult,
  interviewSessionId,
}: {
  toolUIPart: TInterviewMessageWithTool["parts"][number];
  addToolResult?: TAddInterviewUIToolResult;
  interviewSessionId: number;
}) => {
  switch (toolUIPart.type) {
    case `tool-${InterviewToolName.requestInteractionForm}`:
      return (
        <RequestInteractionFormToolMessage
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
        />
      );
    case `tool-${InterviewToolName.selectQuestion}`:
      return (
        <SelectQuestionToolMessage
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
          interviewSessionId={interviewSessionId}
        />
      );
    case `tool-${InterviewToolName.endInterview}`:
      return <InterviewCompleteMessage toolInvocation={toolUIPart} />;
    default:
      return null;
  }
};
