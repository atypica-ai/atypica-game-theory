import { ToolName } from "@/ai/tools/types";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
import { useMemo } from "react";
import { BuildPersonaConsole } from "./console/BuildPersonaConsole";
import { CreateSubAgentConsole } from "./console/CreateSubAgentConsole";
import { GenerateReportConsole } from "./console/GenerateReportConsole";
import { InterviewChatConsole } from "./console/InterviewChatConsole";
import { DiscussionChatConsole } from "./console/DiscussionChatConsole";
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
    case `tool-${ToolName.scoutTaskChat}`:
    case `tool-${ToolName.scoutSocialTrends}`:
      return <ScoutTaskChatConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.interviewChat}`:
      return <InterviewChatConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.discussionChat}`:
      return <DiscussionChatConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.reasoningThinking}`:
      return <ReasoningThinkingConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.generateReport}`:
      return <GenerateReportConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.buildPersona}`:
      return <BuildPersonaConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.searchPersonas}`:
      return <SearchPersonasConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.webSearch}`:
      return <WebSearchConsole toolInvocation={activeTool} />;
    case `tool-${ToolName.createSubAgent}`:
      return <CreateSubAgentConsole toolInvocation={activeTool} />;
    default:
      return activeTool ? <ToolInvocationMessage toolInvocation={activeTool} /> : null;
  }
}
