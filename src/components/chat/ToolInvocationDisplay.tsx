import {
  BuildPersonaResultMessage,
  GenerateReportResultMessage,
  ReasoningThinkingResultMessage,
  ScoutTaskChatResultMessage,
  WebSearchResultMessage,
} from "@/ai/tools/experts/ToolMessage";
import { InterviewChatResultMessage } from "@/ai/tools/experts/ToolMessage/SaveAnalystToolResultMessage";
import { ScoutSocialTrendsResultMessage } from "@/ai/tools/experts/ToolMessage/ScoutSocialTrendsResultMessage";
import { SearchPersonasResultMessage } from "@/ai/tools/experts/ToolMessage/SearchPersonasResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/ai/tools/system/ToolMessage";
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
    case ToolName.webSearch:
      return <WebSearchResultMessage toolInvocation={toolInvocation} />;

    case ToolName.generateReport:
      return <GenerateReportResultMessage toolInvocation={toolInvocation} />;
    case ToolName.scoutTaskChat:
      return <ScoutTaskChatResultMessage toolInvocation={toolInvocation} />;
    case ToolName.scoutSocialTrends:
      return <ScoutSocialTrendsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.audienceCall:
      return <ReasoningThinkingResultMessage toolInvocation={toolInvocation} />;
    case ToolName.buildPersona:
      return <BuildPersonaResultMessage toolInvocation={toolInvocation} />;
    case ToolName.searchPersonas:
      return <SearchPersonasResultMessage toolInvocation={toolInvocation} />;
    case ToolName.interviewChat:
      return <InterviewChatResultMessage toolInvocation={toolInvocation} />;

    case ToolName.saveAnalyst:
      return <SaveAnalystToolResultMessage toolInvocation={toolInvocation} />;

    case ToolName.xhsSearch:
    case ToolName.dySearch:
    case ToolName.tiktokSearch:
    case ToolName.insSearch:
    case ToolName.xhsUserNotes:
    case ToolName.dyUserPosts:
    case ToolName.tiktokUserPosts:
    case ToolName.insUserPosts:
    case ToolName.twitterSearch:
    case ToolName.twitterUserPosts:
      return <SocialPostsResultMessage toolInvocation={toolInvocation} />;

    case ToolName.xhsNoteComments:
    case ToolName.dyPostComments:
    case ToolName.tiktokPostComments:
    case ToolName.insPostComments:
    case ToolName.twitterPostComments:
      return <SocialPostCommentsResultMessage toolInvocation={toolInvocation} />;

    default:
      return null;
  }
};
