import {
  BuildPersonaResultMessage,
  GenerateReportResultMessage,
  ReasoningThinkingResultMessage,
  ScoutTaskChatResultMessage,
} from "@/ai/tools/experts/ToolMessage";
import { InterviewChatResultMessage } from "@/ai/tools/experts/ToolMessage/SaveAnalystToolResultMessage";
import { SearchPersonasResultMessage } from "@/ai/tools/experts/ToolMessage/SearchPersonasResultMessage";
import {
  DYPostCommentsResultMessage,
  DYSearchResultMessage,
  DYUserPostsResultMessage,
} from "@/ai/tools/social/dy/ToolMessage";
import {
  InsPostCommentsResultMessage,
  InsSearchResultMessage,
  InsUserPostsResultMessage,
} from "@/ai/tools/social/ins/ToolMessage";
import {
  TikTokPostCommentsResultMessage,
  TikTokSearchResultMessage,
  TikTokUserPostsResultMessage,
} from "@/ai/tools/social/tiktok/ToolMessage";
import {
  XHSNoteCommentsResultMessage,
  XHSSearchResultMessage,
  XHSUserNotesResultMessage,
} from "@/ai/tools/social/xhs/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/ai/tools/system/ToolMessage";
import { UpdateInterviewProjectToolResultMessage } from "@/ai/tools/system/ToolMessage/UpdateInterviewProjectToolResultMessage";
import { PlainTextToolResult, ToolName } from "@/ai/tools/types";
import {
  RequestInteractionMessage,
  RequestPaymentMessage,
  ThanksMessage,
} from "@/ai/tools/user/ToolMessage";
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
      return <ScoutTaskChatResultMessage toolInvocation={toolInvocation} />;
    case ToolName.buildPersona:
      return <BuildPersonaResultMessage toolInvocation={toolInvocation} />;
    case ToolName.searchPersonas:
      return <SearchPersonasResultMessage toolInvocation={toolInvocation} />;
    case ToolName.interviewChat:
      return <InterviewChatResultMessage toolInvocation={toolInvocation} />;

    case ToolName.saveAnalyst:
      return <SaveAnalystToolResultMessage toolInvocation={toolInvocation} />;
    case ToolName.updateInterviewProject:
      return <UpdateInterviewProjectToolResultMessage toolInvocation={toolInvocation} />;

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
    case ToolName.tiktokSearch:
      return <TikTokSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.tiktokUserPosts:
      return <TikTokUserPostsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.tiktokPostComments:
      return <TikTokPostCommentsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.insSearch:
      return <InsSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.insUserPosts:
      return <InsUserPostsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.insPostComments:
      return <InsPostCommentsResultMessage toolInvocation={toolInvocation} />;

    default:
      return null;
  }
};
