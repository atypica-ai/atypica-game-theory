"use client";

import { ReasoningThinkingExecutionView } from "@/ai/tools/experts/reasoningThinking/ReasoningThinkingExecutionView";
import { WebSearchExecutionView } from "@/ai/tools/experts/webSearch/WebSearchExecutionView";
import { BuildPersonaExecutionView } from "@/app/(study)/tools/buildPersona/BuildPersonaExecutionView";
import { CreateSubAgentExecutionView } from "@/app/(study)/tools/createSubAgent/CreateSubAgentExecutionView";
import { DiscussionChatExecutionView } from "@/app/(study)/tools/discussionChat/DiscussionChatExecutionView";
import { GenerateReportExecutionView } from "@/app/(study)/tools/generateReport/GenerateReportExecutionView";
import { InterviewChatExecutionView } from "@/app/(study)/tools/interviewChat/InterviewChatExecutionView";
import { ScoutTaskChatExecutionView } from "@/app/(study)/tools/scoutTaskChat/ScoutTaskChatExecutionView";
import { SearchPersonasExecutionView } from "@/app/(study)/tools/searchPersonas/SearchPersonasExecutionView";
import { StudyToolName } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
import { useMemo } from "react";
import { useStudyContext } from "./hooks/StudyContext";

export function ToolConsole() {
  const { viewToolInvocation, lastToolInvocation, studyUserChat, replay } = useStudyContext();

  const activeTool = useMemo(() => {
    return viewToolInvocation || lastToolInvocation || null;
  }, [viewToolInvocation, lastToolInvocation]);

  const polling = !replay;

  switch (activeTool?.type) {
    case `tool-${StudyToolName.scoutTaskChat}`:
    case `tool-${StudyToolName.scoutSocialTrends}`:
      return (
        <ScoutTaskChatExecutionView
          toolInvocation={activeTool}
          studyUserChatToken={studyUserChat.token}
          polling={polling}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        />
      );
    case `tool-${StudyToolName.interviewChat}`:
      return (
        <InterviewChatExecutionView
          toolInvocation={activeTool}
          studyUserChatToken={studyUserChat.token}
          studyUserAvatarSeed={studyUserChat.id}
          polling={polling}
          researchTopic={studyUserChat.context.studyTopic}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        />
      );
    case `tool-${StudyToolName.discussionChat}`:
      return <DiscussionChatExecutionView toolInvocation={activeTool} polling={polling} />;
    case `tool-${StudyToolName.reasoningThinking}`:
      return <ReasoningThinkingExecutionView toolInvocation={activeTool} />;
    case `tool-${StudyToolName.generateReport}`:
      return <GenerateReportExecutionView toolInvocation={activeTool} showDownload={polling} />;
    case `tool-${StudyToolName.buildPersona}`:
      return <BuildPersonaExecutionView toolInvocation={activeTool} polling={polling} />;
    case `tool-${StudyToolName.searchPersonas}`:
      return (
        <SearchPersonasExecutionView
          toolInvocation={activeTool}
          userChatToken={studyUserChat.token}
        />
      );
    case `tool-${StudyToolName.webSearch}`:
      return <WebSearchExecutionView toolInvocation={activeTool} />;
    case `tool-${StudyToolName.createSubAgent}`:
      return (
        <CreateSubAgentExecutionView
          toolInvocation={activeTool}
          parentChatToken={studyUserChat.token}
          polling={polling}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        />
      );
    default:
      return activeTool ? <ToolInvocationMessage toolInvocation={activeTool} /> : null;
  }
}
