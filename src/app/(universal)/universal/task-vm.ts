import { TUniversalMessageWithTool, UniversalToolName } from "@/app/(universal)/tools/types";
import { StudyToolName } from "@/app/(study)/tools/types";
import { DynamicToolUIPart, getToolOrDynamicToolName, isToolOrDynamicToolUIPart, ToolUIPart } from "ai";

export type UniversalTaskStatus = "running" | "done" | "error";
export type UniversalTimelineStage = "discovery" | "interview" | "synthesis" | "delivery";

export interface UniversalTaskVM {
  taskId: string;
  toolCallId: string;
  toolName: UniversalToolName.createStudySubAgent;
  status: UniversalTaskStatus;
  title: string;
  summary: string;
  state: ToolUIPart["state"];
  messageId: string;
  messageIndex: number;
  partIndex: number;
  subAgentChatId: number | null;
  subAgentChatToken: string | null;
  resultSummary: string;
}

export type UniversalSubAgentToolPartVM = {
  toolCallId: string;
  toolName: string;
  state: (DynamicToolUIPart | ToolUIPart)["state"];
  stage: UniversalTimelineStage;
  semanticTitle: string;
  defaultSummary: string;
  summary: string;
  messageId: string;
  messageIndex: number;
  partIndex: number;
  part: DynamicToolUIPart | ToolUIPart;
};

const TASK_TITLE_MAX_LEN = 56;
const TASK_SUMMARY_MAX_LEN = 96;
const STEP_SUMMARY_MAX_LEN = 110;

function compact(value: unknown, maxLen = 120): string {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}...` : normalized;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstSentence(text: string, maxLen = 180): string {
  const normalized = stripMarkdown(text);
  if (!normalized) return "";
  const first = normalized
    .split(/[\n。！？!?]/)
    .map((chunk) => chunk.trim())
    .find(Boolean);
  return compact(first || normalized, maxLen);
}

function isMeaninglessSummary(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  if (/^\d+([.,]\d+)?(\s*(steps?|items?|条|个|次))?$/i.test(normalized)) return true;
  if (/^[\d\s.,:;/%+\-()]+$/.test(normalized)) return true;
  if (/^[^\p{L}\p{N}]+$/u.test(normalized)) return true;
  return false;
}

function getToolSemanticMeta(toolName: string): {
  stage: UniversalTimelineStage;
  title: string;
  defaultSummary: string;
} {
  if (toolName === StudyToolName.interviewChat) {
    return {
      stage: "interview",
      title: "Run persona interviews",
      defaultSummary: "Interviewing selected personas for decision and behavior signals.",
    };
  }
  if (toolName === StudyToolName.discussionChat) {
    return {
      stage: "interview",
      title: "Run group discussion",
      defaultSummary: "Running moderated group discussion and collecting viewpoints.",
    };
  }
  if (toolName === StudyToolName.generateReport) {
    return {
      stage: "delivery",
      title: "Generate report",
      defaultSummary: "Producing report artifact from the collected research evidence.",
    };
  }
  if (toolName === StudyToolName.generatePodcast) {
    return {
      stage: "delivery",
      title: "Generate podcast",
      defaultSummary: "Producing podcast artifact based on research findings.",
    };
  }
  if (toolName === StudyToolName.reasoningThinking) {
    return {
      stage: "synthesis",
      title: "Synthesize insights",
      defaultSummary: "Summarizing patterns and trade-offs from collected inputs.",
    };
  }
  if (toolName === StudyToolName.scoutTaskChat || toolName === StudyToolName.scoutSocialTrends) {
    return {
      stage: "discovery",
      title: "Scout target users",
      defaultSummary: "Exploring social platforms to identify target users and signals.",
    };
  }
  if (toolName === StudyToolName.searchPersonas || toolName === StudyToolName.buildPersona) {
    return {
      stage: "discovery",
      title: "Build persona candidates",
      defaultSummary: "Assembling persona candidates for downstream research.",
    };
  }
  if (toolName === StudyToolName.webSearch || toolName === StudyToolName.webFetch) {
    return {
      stage: "discovery",
      title: "Collect web evidence",
      defaultSummary: "Gathering external evidence from web sources.",
    };
  }
  return {
    stage: "synthesis",
    title: "Execute research step",
    defaultSummary: "Completing one step in the research workflow.",
  };
}

function getObjectPartInput(part: ToolUIPart): Record<string, unknown> | null {
  if (!part.input || typeof part.input !== "object") return null;
  return part.input as Record<string, unknown>;
}

function getObjectPartOutput(part: ToolUIPart): Record<string, unknown> | null {
  if (!part.output || typeof part.output !== "object") return null;
  return part.output as Record<string, unknown>;
}

function classifySubAgentTaskStatus(part: ToolUIPart): UniversalTaskStatus {
  if (part.state === "output-error") return "error";
  if (part.state !== "output-available") return "running";
  const output = getObjectPartOutput(part);
  if (output?.status === "failed") return "error";
  if (output?.status === "running") return "running";
  return "done";
}

function getSubAgentTaskTitle(part: ToolUIPart): string {
  const input = getObjectPartInput(part);
  return (
    compact(input?.subAgentTitle, TASK_TITLE_MAX_LEN) ||
    compact(input?.taskRequirement, TASK_TITLE_MAX_LEN) ||
    "Study SubAgent Task"
  );
}

function getSubAgentTaskSummary(part: ToolUIPart): string {
  const output = getObjectPartOutput(part);
  if (part.state === "output-error") return part.errorText ?? "Sub-agent task failed.";
  if (part.state !== "output-available") return "Sub-agent is running...";
  if (output?.status === "running") {
    return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Sub-agent is running...";
  }
  if (output?.status === "failed") {
    return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Sub-agent task failed.";
  }
  return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Sub-agent execution completed.";
}

function getSubAgentChatId(part: ToolUIPart): number | null {
  const output = getObjectPartOutput(part);
  return typeof output?.subAgentChatId === "number" ? output.subAgentChatId : null;
}

function getSubAgentChatToken(part: ToolUIPart): string | null {
  const output = getObjectPartOutput(part);
  return typeof output?.subAgentChatToken === "string" ? output.subAgentChatToken : null;
}

export function extractTasksFromMessages(messages: TUniversalMessageWithTool[]): UniversalTaskVM[] {
  const tasks: UniversalTaskVM[] = [];
  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    message.parts.forEach((part, partIndex) => {
      if (!isToolOrDynamicToolUIPart(part)) return;
      const toolName = getToolOrDynamicToolName(part);
      if (part.type === "dynamic-tool" || toolName !== UniversalToolName.createStudySubAgent) {
        return;
      }

      const summary = getSubAgentTaskSummary(part);
      tasks.push({
        taskId: part.toolCallId,
        toolCallId: part.toolCallId,
        toolName: UniversalToolName.createStudySubAgent,
        status: classifySubAgentTaskStatus(part),
        title: getSubAgentTaskTitle(part),
        summary,
        state: part.state,
        messageId: message.id,
        messageIndex,
        partIndex,
        subAgentChatId: getSubAgentChatId(part),
        subAgentChatToken: getSubAgentChatToken(part),
        resultSummary: summary,
      });
    });
  });

  return tasks.sort((a, b) => {
    const rank = (task: UniversalTaskVM) => (task.status === "running" ? 0 : task.status === "error" ? 1 : 2);
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.messageIndex !== b.messageIndex) return b.messageIndex - a.messageIndex;
    return b.partIndex - a.partIndex;
  });
}

function extractSummaryForToolPart(part: DynamicToolUIPart | ToolUIPart): string {
  const toolName = getToolOrDynamicToolName(part);
  const semantic = getToolSemanticMeta(toolName);
  if (part.state === "output-error") {
    return compact(part.errorText ?? "", STEP_SUMMARY_MAX_LEN) || `Failed: ${semantic.defaultSummary}`;
  }
  if (part.state !== "output-available") {
    return semantic.defaultSummary;
  }

  if (part.type === "dynamic-tool") {
    const dynamicText = compact(
      typeof part.output === "string" ? part.output : JSON.stringify(part.output),
      STEP_SUMMARY_MAX_LEN,
    );
    return isMeaninglessSummary(dynamicText) ? semantic.defaultSummary : dynamicText;
  }

  if (part.output && typeof part.output === "object") {
    const output = part.output as Record<string, unknown>;
    if ("plainText" in output && typeof output.plainText === "string") {
      const summaryFromPlainText = extractFirstSentence(output.plainText, STEP_SUMMARY_MAX_LEN);
      if (!isMeaninglessSummary(summaryFromPlainText)) {
        return summaryFromPlainText;
      }
      return semantic.defaultSummary;
    }
  }

  const fallback = compact(JSON.stringify(part.output), STEP_SUMMARY_MAX_LEN);
  if (!isMeaninglessSummary(fallback)) {
    return fallback;
  }
  return semantic.defaultSummary;
}

export function extractSubAgentToolPartsFromMessages(
  messages: Array<{ id: string; role: string; parts: unknown[] }>,
): UniversalSubAgentToolPartVM[] {
  const parts: UniversalSubAgentToolPartVM[] = [];

  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    message.parts.forEach((part, partIndex) => {
      const uiPart = part as Parameters<typeof isToolOrDynamicToolUIPart>[0];
      if (!isToolOrDynamicToolUIPart(uiPart)) return;
      const toolPart = part as DynamicToolUIPart | ToolUIPart;
      const toolName = getToolOrDynamicToolName(toolPart);
      const semantic = getToolSemanticMeta(toolName);
      parts.push({
        toolCallId: toolPart.toolCallId,
        toolName,
        state: toolPart.state,
        stage: semantic.stage,
        semanticTitle: semantic.title,
        defaultSummary: semantic.defaultSummary,
        summary: extractSummaryForToolPart(toolPart),
        messageId: message.id,
        messageIndex,
        partIndex,
        part: toolPart,
      });
    });
  });

  return parts.sort((a, b) => {
    if (a.messageIndex !== b.messageIndex) return a.messageIndex - b.messageIndex;
    return a.partIndex - b.partIndex;
  });
}
