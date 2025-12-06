import { EndInterviewMessage } from "@/app/(interviewProject)/components/EndInterviewMessage";
import { RequestInteractionFormToolMessage } from "@/app/(interviewProject)/components/RequestInteractionForm";
import { SelectQuestionToolMessage } from "@/app/(interviewProject)/components/SelectQuestionToolMessage";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { InterviewProjectQuestion } from "@/prisma/client";
import { InterviewToolName, TAddInterviewUIToolResult } from "./types";

export const InterviewToolUIPartDisplay = ({
  toolUIPart,
  addToolResult,
  questions,
}: {
  toolUIPart: TInterviewMessageWithTool["parts"][number];
  addToolResult?: TAddInterviewUIToolResult;
  questions: InterviewProjectQuestion[];
}) => {
  switch (toolUIPart.type) {
    case `tool-${InterviewToolName.requestInteractionForm}`:
      return (
        <RequestInteractionFormToolMessage
          key={toolUIPart.toolCallId}
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
        />
      );
    case `tool-${InterviewToolName.selectQuestion}`:
      return (
        <SelectQuestionToolMessage
          key={toolUIPart.toolCallId}
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
          questions={questions}
        />
      );
    case `tool-${InterviewToolName.endInterview}`:
      return <EndInterviewMessage key={toolUIPart.toolCallId} toolInvocation={toolUIPart} />;
    default:
      return null;
  }
};
