import {
  BuildPersonaResultMessage,
  GenerateReportResultMessage,
  ReasoningThinkingResultMessage,
  ScoutTaskChatResultMessage,
  WebSearchResultMessage,
} from "@/ai/tools/experts/ToolMessage";
import { CreateSubAgentResultMessage } from "@/ai/tools/experts/ToolMessage/CreateSubAgentResultMessage";
import { InterviewChatResultMessage } from "@/ai/tools/experts/ToolMessage/InterviewChatResultMessage";
import { PlanStudyToolResultMessage } from "@/ai/tools/experts/ToolMessage/PlanStudyToolResultMessage";
import { ScoutSocialTrendsResultMessage } from "@/ai/tools/experts/ToolMessage/ScoutSocialTrendsResultMessage";
import { SearchPersonasResultMessage } from "@/ai/tools/experts/ToolMessage/SearchPersonasResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/ai/tools/system/ToolMessage";
import { TAddStudyUIToolResult, ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { RequestInteractionMessage, RequestPaymentMessage } from "@/ai/tools/user/ToolMessage";

/**
 * 因为 v5 sdk 的 UIMessage 类型改复杂，这里没法精确定义和 UIMessage 的 TOOLS 对应的 ToolUIPart 类型，但是可以定义 UIMessagePart 的泛型类型
 * 问题也不大，在这个方法里判断一下类型，然后再渲染就好
 */
export const StudyToolUIPartDisplay = ({
  toolUIPart,
  addToolResult,
}: {
  // toolInvocation: Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
  toolUIPart: TStudyMessageWithTool["parts"][number];
  addToolResult?: TAddStudyUIToolResult;
}) => {
  if (!("toolCallId" in toolUIPart)) {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-${ToolName.requestInteraction}`:
      return (
        <RequestInteractionMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />
      );
    case `tool-${ToolName.requestPayment}`:
      return <RequestPaymentMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />;
  }

  if (toolUIPart.state !== "output-available") {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-${ToolName.reasoningThinking}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.webSearch}`:
      return <WebSearchResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.generateReport}`:
      return <GenerateReportResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.scoutTaskChat}`:
      return <ScoutTaskChatResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.scoutSocialTrends}`:
      return <ScoutSocialTrendsResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.audienceCall}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.createSubAgent}`:
      return <CreateSubAgentResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.buildPersona}`:
      return <BuildPersonaResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.interviewChat}`:
      return <InterviewChatResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.saveAnalyst}`:
      return <SaveAnalystToolResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.planStudy}`:
      return <PlanStudyToolResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.xhsSearch}`:
    case `tool-${ToolName.dySearch}`:
    case `tool-${ToolName.tiktokSearch}`:
    case `tool-${ToolName.insSearch}`:
    case `tool-${ToolName.xhsUserNotes}`:
    case `tool-${ToolName.dyUserPosts}`:
    case `tool-${ToolName.tiktokUserPosts}`:
    case `tool-${ToolName.insUserPosts}`:
    case `tool-${ToolName.twitterSearch}`:
    case `tool-${ToolName.twitterUserPosts}`:
      return <SocialPostsResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.xhsNoteComments}`:
    case `tool-${ToolName.dyPostComments}`:
    case `tool-${ToolName.tiktokPostComments}`:
    case `tool-${ToolName.insPostComments}`:
    case `tool-${ToolName.twitterPostComments}`:
      return <SocialPostCommentsResultMessage toolInvocation={toolUIPart} />;

    default:
      return null;
  }
};
