import { ToolName } from "@/ai/tools/types";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
import { useMemo } from "react";
import { BuildPersonaConsole } from "./console/BuildPersonaConsole";
import { GenerateReportConsole } from "./console/GenerateReportConsole";
import { InterviewChatConsole } from "./console/InterviewChatConsole";
import { ReasoningThinkingConsole } from "./console/ReasoningThinkingConsole";
import { ScoutTaskChatConsole } from "./console/ScoutTaskChatConsole";
import { SearchPersonasConsole } from "./console/SearchPersonasConsole";
import { useStudyContext } from "./hooks/StudyContext";

export function ToolConsole() {
  const { viewToolInvocation, lastToolInvocation } = useStudyContext();

  const activeTool = useMemo(() => {
    return viewToolInvocation || lastToolInvocation || null;
  }, [viewToolInvocation, lastToolInvocation]);

  switch (activeTool?.toolName) {
    case ToolName.scoutTaskChat:
    case ToolName.scoutSocialTrends:
      return <ScoutTaskChatConsole toolInvocation={activeTool} />;
    case ToolName.interviewChat:
      return <InterviewChatConsole toolInvocation={activeTool} />;
    case ToolName.reasoningThinking:
      return <ReasoningThinkingConsole toolInvocation={activeTool} />;
    case ToolName.generateReport:
      return <GenerateReportConsole toolInvocation={activeTool} />;
    case ToolName.buildPersona:
      return <BuildPersonaConsole toolInvocation={activeTool} />;
    case ToolName.searchPersonas:
      return <SearchPersonasConsole toolInvocation={activeTool} />;
    default:
      return activeTool ? <ToolInvocationMessage toolInvocation={activeTool} /> : null;
  }
}
