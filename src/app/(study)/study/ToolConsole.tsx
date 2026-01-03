import { StudyToolName } from "@/app/(study)/tools/types";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
import { useMemo } from "react";
import { BuildPersonaConsole } from "./console/BuildPersonaConsole";
import { CreateSubAgentConsole } from "./console/CreateSubAgentConsole";
import { DiscussionChatConsole } from "./console/DiscussionChatConsole";
import { GenerateReportConsole } from "./console/GenerateReportConsole";
import { InterviewChatConsole } from "./console/InterviewChatConsole";
import { ReasoningThinkingConsole } from "./console/ReasoningThinkingConsole";
import { ScoutTaskChatConsole } from "./console/ScoutTaskChatConsole";
import { SearchPersonasConsole } from "./console/SearchPersonasConsole";
import { WebSearchConsole } from "./console/WebSearchConsole";
import { useStudyContext } from "./hooks/StudyContext";

export function ToolConsole() {
  const { viewToolInvocation, lastToolInvocation } = useStudyContext();

  const activeTool = useMemo(() => {
    return viewToolInvocation || lastToolInvocation || null;
  }, [viewToolInvocation, lastToolInvocation]);

  switch (activeTool?.type) {
    case `tool-${StudyToolName.scoutTaskChat}`:
    case `tool-${StudyToolName.scoutSocialTrends}`:
      return <ScoutTaskChatConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.interviewChat}`:
      return <InterviewChatConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.discussionChat}`:
      return <DiscussionChatConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.reasoningThinking}`:
      return <ReasoningThinkingConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.generateReport}`:
      return <GenerateReportConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.buildPersona}`:
      return <BuildPersonaConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.searchPersonas}`:
      return <SearchPersonasConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.webSearch}`:
      return <WebSearchConsole toolInvocation={activeTool} />;
    case `tool-${StudyToolName.createSubAgent}`:
      return <CreateSubAgentConsole toolInvocation={activeTool} />;
    default:
      return activeTool ? <ToolInvocationMessage toolInvocation={activeTool} /> : null;
  }
}
