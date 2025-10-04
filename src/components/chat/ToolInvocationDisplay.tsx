import {
  BuildPersonaResultMessage,
  GenerateReportResultMessage,
  ReasoningThinkingResultMessage,
  ScoutTaskChatResultMessage,
  WebSearchResultMessage,
} from "@/ai/tools/experts/ToolMessage";
import { InterviewChatResultMessage } from "@/ai/tools/experts/ToolMessage/InterviewChatResultMessage";
import { PlanStudyToolResultMessage } from "@/ai/tools/experts/ToolMessage/PlanStudyToolResultMessage";
import { ScoutSocialTrendsResultMessage } from "@/ai/tools/experts/ToolMessage/ScoutSocialTrendsResultMessage";
import { SearchPersonasResultMessage } from "@/ai/tools/experts/ToolMessage/SearchPersonasResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/ai/tools/system/ToolMessage";
import { ToolName, UIToolConfigs } from "@/ai/tools/types";
import {
  RequestInteractionMessage,
  RequestPaymentMessage,
  ThanksMessage,
} from "@/ai/tools/user/ToolMessage";
import { ToolUIPart, UITools } from "ai";

// ⚠️ 把 ToolUIPart<X> 里面的 X 取出来，比如大部分地方使用的定义在 ai/tools/types.ts 里的 UIToolConfigs
type InferUIMessageTools<T extends ToolUIPart> =
  T extends ToolUIPart<infer TOOLS> ? TOOLS : UITools;

export type TAddToolResult<UI_PART extends ToolUIPart> = <
  TName extends keyof InferUIMessageTools<UI_PART>,
>({
  state,
  tool,
  toolCallId,
  output,
  errorText,
}:
  | {
      state?: "output-available";
      tool: TName;
      toolCallId: string;
      output: InferUIMessageTools<UI_PART>[TName]["output"];
      errorText?: never;
    }
  | {
      state: "output-error";
      tool: TName;
      toolCallId: string;
      output?: never;
      errorText: string;
    }) => Promise<void>;

export const ToolInvocationDisplay = ({
  toolInvocation,
  addToolResult,
}: {
  // toolInvocation: Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;
  toolInvocation: ToolUIPart<UIToolConfigs>;
  addToolResult?: TAddToolResult<ToolUIPart<UIToolConfigs>>;
}) => {
  switch (toolInvocation.type) {
    case `tool-${ToolName.requestInteraction}`:
      return (
        <RequestInteractionMessage toolInvocation={toolInvocation} addToolResult={addToolResult} />
      );
    case `tool-${ToolName.requestPayment}`:
      return (
        <RequestPaymentMessage toolInvocation={toolInvocation} addToolResult={addToolResult} />
      );
    case `tool-${ToolName.thanks}`:
      return <ThanksMessage toolInvocation={toolInvocation} />;
  }

  if (toolInvocation.state !== "output-available") {
    return null;
  }

  switch (toolInvocation.type) {
    case `tool-${ToolName.reasoningThinking}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.webSearch}`:
      return <WebSearchResultMessage toolInvocation={toolInvocation} />;

    case `tool-${ToolName.generateReport}`:
      return <GenerateReportResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.scoutTaskChat}`:
      return <ScoutTaskChatResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.scoutSocialTrends}`:
      return <ScoutSocialTrendsResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.audienceCall}`:
      return <ReasoningThinkingResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.buildPersona}`:
      return <BuildPersonaResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.interviewChat}`:
      return <InterviewChatResultMessage toolInvocation={toolInvocation} />;

    case `tool-${ToolName.saveAnalyst}`:
      return <SaveAnalystToolResultMessage toolInvocation={toolInvocation} />;
    case `tool-${ToolName.planStudy}`:
      return <PlanStudyToolResultMessage toolInvocation={toolInvocation} />;

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
      return <SocialPostsResultMessage toolInvocation={toolInvocation} />;

    case `tool-${ToolName.xhsNoteComments}`:
    case `tool-${ToolName.dyPostComments}`:
    case `tool-${ToolName.tiktokPostComments}`:
    case `tool-${ToolName.insPostComments}`:
    case `tool-${ToolName.twitterPostComments}`:
      return <SocialPostCommentsResultMessage toolInvocation={toolInvocation} />;

    default:
      return null;
  }
};
