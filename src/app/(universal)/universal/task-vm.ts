/**
 * Task View Model — 从 AI SDK messages 提取 tool call 数据，转换为 UI 可用的纯数据结构。
 *
 * 两个核心函数：
 * - extractTasksFromMessages: 从 universal messages 提取 createSubAgent tool calls → UniversalTaskVM[]
 *   用于任务列表面板，展示每个 sub-agent 的状态、标题、摘要
 *
 * - extractSubAgentToolPartsFromMessages: 从 sub-agent messages 提取 study tool calls → UniversalSubAgentToolPartVM[]
 *   用于任务详情面板的时间线，展示 sub-agent 执行的每个步骤（discovery → interview → synthesis → delivery）
 */
import { TUniversalMessageWithTool, UniversalToolName, UniversalUITools } from "@/app/(universal)/tools/types";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { DynamicToolUIPart, getToolOrDynamicToolName, isToolOrDynamicToolUIPart, ToolUIPart } from "ai";

export type UniversalTaskStatus = "running" | "done" | "error";
export type UniversalTimelineStage = "discovery" | "interview" | "synthesis" | "delivery";

export interface UniversalTaskVM {
  taskId: string;
  toolCallId: string;
  toolName: UniversalToolName.createSubAgent;
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

// The narrowed type produced by isToolOrDynamicToolUIPart<StudyUITools>.
// Using ToolUIPart<StudyUITools> (not the base ToolUIPart) means callers can
// discriminate by part.type and get fully typed access without any casts.
export type StudyToolOrDynamicPart = ToolUIPart<StudyUITools> | DynamicToolUIPart;

export type UniversalSubAgentToolPartVM = {
  toolCallId: string;
  toolName: string;
  state: StudyToolOrDynamicPart["state"];
  stage: UniversalTimelineStage;
  semanticTitle: string;
  defaultSummary: string;
  summary: string;
  messageId: string;
  messageIndex: number;
  partIndex: number;
  part: StudyToolOrDynamicPart;
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

// Narrowed type for the createSubAgent tool part — gives typed input/output access.
type CreateSubAgentPart = ToolUIPart<Pick<UniversalUITools, UniversalToolName.createSubAgent>>;

function classifySubAgentTaskStatus(part: CreateSubAgentPart): UniversalTaskStatus {
  if (part.state === "output-error") return "error";
  if (part.state !== "output-available") return "running";
  if (part.output?.status === "failed") return "error";
  if (part.output?.status === "running") return "running";
  return "done";
}

function getSubAgentTaskTitle(part: CreateSubAgentPart): string {
  return (
    compact(part.input?.subAgentTitle, TASK_TITLE_MAX_LEN) ||
    compact(part.input?.taskRequirement, TASK_TITLE_MAX_LEN) ||
    "Research Task"
  );
}

function getSubAgentTaskSummary(part: CreateSubAgentPart): string {
  if (part.state === "output-error") return part.errorText ?? "Execution failed.";
  if (part.state !== "output-available") return "In progress...";
  if (part.output?.status === "running") {
    return compact(part.output.resultSummary, TASK_SUMMARY_MAX_LEN) || "In progress...";
  }
  if (part.output?.status === "failed") {
    return compact(part.output.resultSummary, TASK_SUMMARY_MAX_LEN) || "Execution failed.";
  }
  return compact(part.output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Completed.";
}

export function extractTasksFromMessages(messages: TUniversalMessageWithTool[]): UniversalTaskVM[] {
  const tasks: UniversalTaskVM[] = [];
  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    message.parts.forEach((part, partIndex) => {
      if (!isToolOrDynamicToolUIPart(part)) return;
      // Narrow to createSubAgent by checking part.type directly — gives typed input/output.
      if (part.type !== `tool-${UniversalToolName.createSubAgent}`) return;

      const summary = getSubAgentTaskSummary(part);
      tasks.push({
        taskId: part.toolCallId,
        toolCallId: part.toolCallId,
        toolName: UniversalToolName.createSubAgent,
        status: classifySubAgentTaskStatus(part),
        title: getSubAgentTaskTitle(part),
        summary,
        state: part.state,
        messageId: message.id,
        messageIndex,
        partIndex,
        subAgentChatId: part.output?.subAgentChatId ?? null,
        subAgentChatToken: part.output?.subAgentChatToken ?? null,
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

// Extract real content from tool output. Falls back to defaultSummary when unavailable.
function extractSummaryForToolPart(part: StudyToolOrDynamicPart, defaultSummary: string): string {
  if (part.state === "output-error") {
    return compact(part.errorText ?? "", STEP_SUMMARY_MAX_LEN) || `Failed: ${defaultSummary}`;
  }
  if (part.state !== "output-available") {
    return defaultSummary;
  }

  if (part.type === "dynamic-tool") {
    const dynamicText = compact(
      typeof part.output === "string" ? part.output : JSON.stringify(part.output),
      STEP_SUMMARY_MAX_LEN,
    );
    return isMeaninglessSummary(dynamicText) ? defaultSummary : dynamicText;
  }

  if (part.output && typeof part.output === "object") {
    const output = part.output as Record<string, unknown>;
    if ("plainText" in output && typeof output.plainText === "string") {
      const summaryFromPlainText = extractFirstSentence(output.plainText, STEP_SUMMARY_MAX_LEN);
      return isMeaninglessSummary(summaryFromPlainText) ? defaultSummary : summaryFromPlainText;
    }
  }

  const fallback = compact(JSON.stringify(part.output), STEP_SUMMARY_MAX_LEN);
  return isMeaninglessSummary(fallback) ? defaultSummary : fallback;
}

export function extractSubAgentToolPartsFromMessages(
  messages: Array<Pick<TStudyMessageWithTool, "id" | "role" | "parts">>,
): UniversalSubAgentToolPartVM[] {
  const parts: UniversalSubAgentToolPartVM[] = [];

  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    message.parts.forEach((part, partIndex) => {
      // isToolOrDynamicToolUIPart<StudyUITools> narrows to ToolUIPart<StudyUITools> | DynamicToolUIPart,
      // preserving the full parameterized union so downstream callers can discriminate by part.type.
      if (!isToolOrDynamicToolUIPart(part)) return;
      const toolName = getToolOrDynamicToolName(part);
      const semantic = getToolSemanticMeta(toolName);
      parts.push({
        toolCallId: part.toolCallId,
        toolName,
        state: part.state,
        stage: semantic.stage,
        semanticTitle: semantic.title,
        defaultSummary: semantic.defaultSummary,
        summary: extractSummaryForToolPart(part, semantic.defaultSummary),
        messageId: message.id,
        messageIndex,
        partIndex,
        part,
      });
    });
  });

  return parts.sort((a, b) => {
    if (a.messageIndex !== b.messageIndex) return a.messageIndex - b.messageIndex;
    return a.partIndex - b.partIndex;
  });
}
