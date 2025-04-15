import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
import { ToolName } from "@/tools";
import { useMemo } from "react";
import { useStudyContext } from "./hooks/StudyContext";
import GenerateReport from "./tools/console/GenerateReport";
import InterviewChat from "./tools/console/InterviewChat";
import ReasoningThinking from "./tools/console/ReasoningThinking";
import ScoutTaskChat from "./tools/console/ScoutTaskChat";

export function ToolConsole() {
  const { viewToolInvocation, lastToolInvocation } = useStudyContext();

  const activeTool = useMemo(() => {
    return viewToolInvocation || lastToolInvocation || null;
  }, [viewToolInvocation, lastToolInvocation]);

  switch (activeTool?.toolName) {
    case ToolName.scoutTaskChat:
      return <ScoutTaskChat toolInvocation={activeTool} />;
    case ToolName.interviewChat:
      return <InterviewChat toolInvocation={activeTool} />;
    case ToolName.reasoningThinking:
      return <ReasoningThinking toolInvocation={activeTool} />;
    case ToolName.generateReport:
      return <GenerateReport toolInvocation={activeTool} />;
    default:
      return activeTool ? <ToolInvocationMessage toolInvocation={activeTool} /> : null;
  }
}
