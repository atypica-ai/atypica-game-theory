import { TUniversalMessageWithTool, UniversalToolName } from "@/app/(universal)/tools/types";
import { DynamicToolUIPart, getToolOrDynamicToolName, isToolOrDynamicToolUIPart, ToolUIPart } from "ai";

export type UniversalTaskPart = DynamicToolUIPart | ToolUIPart;

export type UniversalTaskKind =
  | "focusGroup"
  | "interview"
  | "research"
  | "report"
  | "artifact"
  | "interaction"
  | "other";

export type UniversalTaskStatus = "running" | "done" | "error";

export interface UniversalTaskVM {
  toolCallId: string;
  toolName: string;
  kind: UniversalTaskKind;
  status: UniversalTaskStatus;
  title: string;
  summary: string;
  state: UniversalTaskPart["state"];
  messageId: string;
  messageIndex: number;
  partIndex: number;
  part: UniversalTaskPart;
}

const TASK_DISPLAY_NAMES: Record<string, string> = {
  [UniversalToolName.discussionChat]: "Focus Group Discussion",
  [UniversalToolName.interviewChat]: "Persona Interview",
  [UniversalToolName.searchPersonas]: "Search Personas",
  [UniversalToolName.generateReport]: "Generate Report",
  [UniversalToolName.generatePodcast]: "Generate Podcast",
  [UniversalToolName.deepResearch]: "Deep Research",
};

const MAJOR_TASK_TOOL_NAMES = new Set<string>([
  UniversalToolName.discussionChat,
  UniversalToolName.interviewChat,
  UniversalToolName.generateReport,
  UniversalToolName.generatePodcast,
  UniversalToolName.deepResearch,
]);

export function shouldDisplayInTaskPanel(toolName: string): boolean {
  return MAJOR_TASK_TOOL_NAMES.has(toolName);
}

export function getTaskDisplayName(toolName: string): string {
  return TASK_DISPLAY_NAMES[toolName] ?? toolName;
}

export function classifyTaskKind(toolName: string): UniversalTaskKind {
  switch (toolName) {
    case UniversalToolName.discussionChat:
      return "focusGroup";
    case UniversalToolName.interviewChat:
      return "interview";
    case UniversalToolName.searchPersonas:
    case UniversalToolName.reasoningThinking:
    case UniversalToolName.webFetch:
    case UniversalToolName.webSearch:
      return "research";
    case UniversalToolName.generateReport:
      return "report";
    case UniversalToolName.generatePodcast:
    case UniversalToolName.updatePanel:
      return "artifact";
    case UniversalToolName.requestSelectPersonas:
    case UniversalToolName.confirmPanelResearchPlan:
      return "interaction";
    default:
      return "other";
  }
}

function classifyTaskStatus(state: UniversalTaskPart["state"]): UniversalTaskStatus {
  if (state === "output-error") return "error";
  if (state === "output-available") return "done";
  return "running";
}

function tryGetPlainTextOutput(part: UniversalTaskPart): string {
  if (part.state !== "output-available") return "";
  if (part.type === "dynamic-tool") {
    return typeof part.output === "string" ? part.output : JSON.stringify(part.output);
  }
  if (part.output && typeof part.output === "object" && "plainText" in part.output) {
    const value = part.output.plainText;
    return typeof value === "string" ? value : "";
  }
  return JSON.stringify(part.output);
}

function buildTaskTitle(part: UniversalTaskPart, toolName: string): string {
  if (part.type === "dynamic-tool") return toolName;
  return getTaskDisplayName(toolName);
}

export function extractTasksFromMessages(messages: TUniversalMessageWithTool[]): UniversalTaskVM[] {
  const tasks: UniversalTaskVM[] = [];
  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    message.parts.forEach((part, partIndex) => {
      if (!isToolOrDynamicToolUIPart(part)) return;
      const toolName = getToolOrDynamicToolName(part);
      if (!shouldDisplayInTaskPanel(toolName)) return;
      const summary = tryGetPlainTextOutput(part);
      tasks.push({
        toolCallId: part.toolCallId,
        toolName,
        kind: classifyTaskKind(toolName),
        status: classifyTaskStatus(part.state),
        title: buildTaskTitle(part, toolName),
        summary,
        state: part.state,
        messageId: message.id,
        messageIndex,
        partIndex,
        part,
      });
    });
  });

  return tasks.sort((a, b) => {
    if (a.messageIndex !== b.messageIndex) return b.messageIndex - a.messageIndex;
    return b.partIndex - a.partIndex;
  });
}
