import {
  BuildPersonaResultMessage,
  GeneratePodcastResultMessage,
  GenerateReportResultMessage,
  ReasoningThinkingResultMessage,
  ScoutTaskChatResultMessage,
  WebSearchResultMessage,
} from "@/ai/tools/experts/ToolMessage";
import { InterviewChatResultMessage } from "@/ai/tools/experts/ToolMessage/InterviewChatResultMessage";
import { SearchPersonasResultMessage } from "@/ai/tools/experts/ToolMessage/SearchPersonasResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/ai/tools/system/ToolMessage";
import {
  PlainTextUITools,
  TAddStudyUIToolResult,
  ToolName,
  TStudyMessageWithTool,
} from "@/ai/tools/types";
import { RequestInteractionMessage, RequestPaymentMessage } from "@/ai/tools/user/ToolMessage";
import { ToolUIPart } from "ai";
import { Streamdown } from "streamdown";
import { DiscussionChatResultMessage } from "./experts/discussionChat/DiscussionChatResultMessage";

export const PlainTextToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<ToolUIPart<PlainTextUITools>, { state: "output-available" }>;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <Streamdown>{toolInvocation.output.plainText}</Streamdown>
    </div>
  );
};

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
    case `tool-${ToolName.generatePodcast}`:
      return <GeneratePodcastResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.scoutTaskChat}`:
      return <ScoutTaskChatResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.audienceCall}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.buildPersona}`:
      return <BuildPersonaResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.interviewChat}`:
      return <InterviewChatResultMessage toolInvocation={toolUIPart} />;
    case `tool-${ToolName.discussionChat}`:
      return <DiscussionChatResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.saveAnalyst}`:
      return <SaveAnalystToolResultMessage toolInvocation={toolUIPart} />;

    case `tool-${ToolName.scoutSocialTrends}`:
    case `tool-${ToolName.createSubAgent}`:
    case `tool-${ToolName.planStudy}`:
    case `tool-${ToolName.planPodcast}`:
    case `tool-${ToolName.deepResearch}`:
      return <PlainTextToolResultMessage toolInvocation={toolUIPart} />;

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
