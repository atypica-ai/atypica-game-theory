import { GenerateReportResultMessage } from "@/app/study/tools/message/GenerateReportResultMessage";
import { RequestInteractionMessage } from "@/app/study/tools/message/RequestInteractionMessage";
import { RequestPaymentMessage } from "@/app/study/tools/message/RequestPaymentMessage";
import { ScoutTaskResultMessage } from "@/app/study/tools/message/ScoutTaskResultMessage";
import { ToolName } from "@/tools";
import {
  DYPostCommentsResultMessage,
  DYSearchResultMessage,
  DYUserPostsResultMessage,
} from "@/tools/dy/ToolMessage";
import { ReasoningThinkingResultMessage } from "@/tools/experts/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/tools/system/ToolMessage";
import { ThanksMessage } from "@/tools/user/ToolMessage";
import { PlainTextToolResult } from "@/tools/utils";
import {
  XHSNoteCommentsResultMessage,
  XHSSearchResultMessage,
  XHSUserNotesResultMessage,
} from "@/tools/xhs/ToolMessage";
import { ToolInvocation } from "ai";

export type TAddToolResult = ({
  toolCallId,
  result,
}: {
  toolCallId: string;
  result: PlainTextToolResult;
}) => void;

export const ToolInvocationDisplay = ({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: ToolInvocation;
  addToolResult?: TAddToolResult;
}) => {
  switch (toolInvocation.toolName) {
    case ToolName.requestInteraction:
      return (
        <RequestInteractionMessage toolInvocation={toolInvocation} addToolResult={addToolResult} />
      );
    case ToolName.requestPayment:
      return (
        <RequestPaymentMessage toolInvocation={toolInvocation} addToolResult={addToolResult} />
      );
    case ToolName.thanks:
      return <ThanksMessage toolInvocation={toolInvocation} />;
  }

  if (toolInvocation.state !== "result") {
    return null;
  }

  switch (toolInvocation.toolName) {
    case ToolName.reasoningThinking:
      return <ReasoningThinkingResultMessage toolInvocation={toolInvocation} />;

    case ToolName.generateReport:
      return <GenerateReportResultMessage toolInvocation={toolInvocation} />;
    case ToolName.scoutTaskChat:
      return <ScoutTaskResultMessage toolInvocation={toolInvocation} />;

    case ToolName.saveAnalyst:
      return <SaveAnalystToolResultMessage toolInvocation={toolInvocation} />;

    case ToolName.xhsSearch:
      return <XHSSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.xhsUserNotes:
      return <XHSUserNotesResultMessage toolInvocation={toolInvocation} />;
    case ToolName.xhsNoteComments:
      return <XHSNoteCommentsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dySearch:
      return <DYSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dyUserPosts:
      return <DYUserPostsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dyPostComments:
      return <DYPostCommentsResultMessage toolInvocation={toolInvocation} />;

    default:
      return null;
  }
};
