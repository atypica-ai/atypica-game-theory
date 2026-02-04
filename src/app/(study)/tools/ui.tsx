"use client";
import { ReasoningThinkingResultMessage } from "@/ai/tools/experts/reasoningThinking/ReasoningThinkingResultMessage";
import { WebSearchResultMessage } from "@/ai/tools/experts/webSearch/WebSearchResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { PlainTextUITools } from "@/ai/tools/types";
import { RequestPaymentMessage } from "@/ai/tools/user/payment/RequestPaymentMessage";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { RequestInteractionMessage } from "@/app/(study)/tools/requestInteraction/RequestInteractionMessage";
import { StudyToolName } from "@/app/(study)/tools/types";
import { useFormatContent } from "@/app/api/format-content/useFormatContent";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { LoaderIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { BuildPersonaResultMessage } from "./buildPersona/BuildPersonaResultMessage";
import { GeneratePodcastResultMessage } from "./generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "./generateReport/GenerateReportResultMessage";
import { MakeStudyPlanMessage } from "./makeStudyPlan/MakeStudyPlanMessage";
import { SaveAnalystToolResultMessage } from "./saveAnalyst/SaveAnalystToolResultMessage";
import { ScoutTaskChatResultMessage } from "./scoutTaskChat/ScoutTaskChatResultMessage";
import { SearchPersonasResultMessage } from "./searchPersonas/SearchPersonasResultMessage";
import { TAddStudyUIToolResult, TStudyMessageWithTool } from "./types";

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

export const FormattedContentToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<ToolUIPart<PlainTextUITools>, { state: "output-available" }>;
}) => {
  const { replay } = useStudyContext();
  const hasCalledRef = useRef(false);

  const {
    formattedHtml,
    isLoading: isFormatting,
    formatContent,
    stop,
  } = useFormatContent({
    live: !replay,
  });

  useEffect(() => {
    // 防止 React Strict Mode 重复调用
    if (hasCalledRef.current) {
      return;
    }

    const plainText = toolInvocation.output.plainText;
    if (plainText) {
      hasCalledRef.current = true;
      formatContent(plainText);
    }

    return () => {
      // cleanup 时停止正在进行的请求
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.toolCallId]);

  return (
    <div
      className={cn(
        "p-2 rounded-lg border border-zinc-100 dark:border-zinc-700",
        "text-xs space-y-2",
      )}
    >
      <div className="">
        {/* Formatted HTML Content */}
        {isFormatting && (
          <div className="flex items-center gap-2 text-blue-600">
            <LoaderIcon className="animate-spin" size={14} />
            <span>formatting</span>
          </div>
        )}
        {formattedHtml ? (
          <div
            className="formatted-audience-feedback prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : (
          !isFormatting && (
            <Streamdown
              mode="static" // static 模式可以大大提升渲染速度
              parseIncompleteMarkdown={false}
              isAnimating={false}
              cdnUrl={null}
            >
              {toolInvocation.output.plainText}
            </Streamdown>
          )
        )}
      </div>
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
