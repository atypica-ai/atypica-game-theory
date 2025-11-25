import { EndInterviewMessage } from "@/app/(interviewProject)/components/EndInterviewMessage";
import { RequestInteractionFormToolMessage } from "@/app/(interviewProject)/components/RequestInteractionForm";
import { SelectQuestionToolMessage } from "@/app/(interviewProject)/components/SelectQuestionToolMessage";
import { QuestionData, TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { InterviewToolName, TAddInterviewUIToolResult } from "./types";

export const InterviewToolUIPartDisplay = ({
  toolUIPart,
  addToolResult,
  questions,
}: {
  toolUIPart: TInterviewMessageWithTool["parts"][number];
  addToolResult?: TAddInterviewUIToolResult;
  questions: QuestionData[];
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
