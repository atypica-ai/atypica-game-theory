"use client";
import { ReasoningThinkingResultMessage } from "@/ai/tools/experts/reasoningThinking/ReasoningThinkingResultMessage";
import { WebSearchResultMessage } from "@/ai/tools/experts/webSearch/WebSearchResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { PlainTextToolResultMessage } from "@/ai/tools/ui";
import { RequestPaymentMessage } from "@/ai/tools/user/payment/RequestPaymentMessage";
import { RequestInteractionMessage } from "@/app/(study)/tools/requestInteraction/RequestInteractionMessage";
import { StudyToolName } from "@/app/(study)/tools/types";
import { FormattedContentToolResultMessage } from "@/app/api/format-content/ui";
import { BuildPersonaResultMessage } from "./buildPersona/BuildPersonaResultMessage";
import { GeneratePodcastResultMessage } from "./generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "./generateReport/GenerateReportResultMessage";
import { MakeStudyPlanMessage } from "./makeStudyPlan/MakeStudyPlanMessage";
import { SaveAnalystToolResultMessage } from "./saveAnalyst/SaveAnalystToolResultMessage";
import { ScoutTaskChatResultMessage } from "./scoutTaskChat/ScoutTaskChatResultMessage";
import { SearchPersonasResultMessage } from "./searchPersonas/SearchPersonasResultMessage";
import { TAddStudyUIToolResult, TStudyMessageWithTool } from "./types";

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
    case `tool-${StudyToolName.requestInteraction}`:
      return (
        <RequestInteractionMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />
      );
    case `tool-${StudyToolName.requestPayment}`:
      return <RequestPaymentMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />;
    case `tool-${StudyToolName.makeStudyPlan}`:
      return <MakeStudyPlanMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />;
  }

  if (toolUIPart.state !== "output-available") {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-${StudyToolName.reasoningThinking}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.webSearch}`:
      return <WebSearchResultMessage toolInvocation={toolUIPart} />;

    case `tool-${StudyToolName.generateReport}`:
      return <GenerateReportResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.generatePodcast}`:
      return <GeneratePodcastResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.scoutTaskChat}`:
      return <ScoutTaskChatResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.buildPersona}`:
      return <BuildPersonaResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolUIPart} />;
    case `tool-${StudyToolName.saveAnalyst}`:
      return <SaveAnalystToolResultMessage toolInvocation={toolUIPart} />;

    case `tool-${StudyToolName.audienceCall}`:
    case `tool-${StudyToolName.scoutSocialTrends}`:
    case `tool-${StudyToolName.planStudy}`:
    case `tool-${StudyToolName.planPodcast}`:
    case `tool-${StudyToolName.deepResearch}`:
    case `tool-${StudyToolName.interviewChat}`:
    case `tool-${StudyToolName.discussionChat}`:
      return <FormattedContentToolResultMessage toolInvocation={toolUIPart} />;

    case `tool-${StudyToolName.createSubAgent}`:
      return <PlainTextToolResultMessage toolInvocation={toolUIPart} />;

    case `tool-${StudyToolName.xhsSearch}`:
    case `tool-${StudyToolName.dySearch}`:
    case `tool-${StudyToolName.tiktokSearch}`:
    case `tool-${StudyToolName.insSearch}`:
    case `tool-${StudyToolName.xhsUserNotes}`:
    case `tool-${StudyToolName.dyUserPosts}`:
    case `tool-${StudyToolName.tiktokUserPosts}`:
    case `tool-${StudyToolName.insUserPosts}`:
    case `tool-${StudyToolName.twitterSearch}`:
    case `tool-${StudyToolName.twitterUserPosts}`:
      return <SocialPostsResultMessage toolInvocation={toolUIPart} />;

    case `tool-${StudyToolName.xhsNoteComments}`:
    case `tool-${StudyToolName.dyPostComments}`:
    case `tool-${StudyToolName.tiktokPostComments}`:
    case `tool-${StudyToolName.insPostComments}`:
    case `tool-${StudyToolName.twitterPostComments}`:
      return <SocialPostCommentsResultMessage toolInvocation={toolUIPart} />;

    default:
      return null;
  }
};
