import { TUniversalMessageWithTool, UniversalToolName } from "@/app/(universal)/tools/types";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { DynamicToolUIPart, getToolOrDynamicToolName, isToolOrDynamicToolUIPart, ToolUIPart } from "ai";

export type UniversalTaskStatus = "running" | "done" | "error";
export type UniversalTimelineStage = "discovery" | "interview" | "synthesis" | "delivery";

// Derive step key types from the i18n JSON so they stay in sync automatically.
import universalMessages from "@/app/(universal)/messages/en-US.json";
type UniversalAgentKey = keyof typeof universalMessages.UniversalAgent;
export type StepTitleKey = Extract<UniversalAgentKey, `step${string}Title`>;
export type StepSummaryKey = Extract<UniversalAgentKey, `step${string}Summary`>;

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

// The narrowed type produced by isToolOrDynamicToolUIPart<StudyUITools>.
// Using ToolUIPart<StudyUITools> (not the base ToolUIPart) means callers can
// discriminate by part.type and get fully typed access without any casts.
export type StudyToolOrDynamicPart = ToolUIPart<StudyUITools> | DynamicToolUIPart;

export type UniversalSubAgentToolPartVM = {
  toolCallId: string;
  toolName: string;
  state: StudyToolOrDynamicPart["state"];
  stage: UniversalTimelineStage;
  titleKey: StepTitleKey;
  defaultSummaryKey: StepSummaryKey;
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
  titleKey: StepTitleKey;
  defaultSummaryKey: StepSummaryKey;
} {
  if (toolName === StudyToolName.interviewChat) {
    return { stage: "interview", titleKey: "stepInterviewTitle", defaultSummaryKey: "stepInterviewSummary" };
  }
  if (toolName === StudyToolName.discussionChat) {
    return { stage: "interview", titleKey: "stepDiscussionTitle", defaultSummaryKey: "stepDiscussionSummary" };
  }
  if (toolName === StudyToolName.generateReport) {
    return { stage: "delivery", titleKey: "stepReportTitle", defaultSummaryKey: "stepReportSummary" };
  }
  if (toolName === StudyToolName.generatePodcast) {
    return { stage: "delivery", titleKey: "stepPodcastTitle", defaultSummaryKey: "stepPodcastSummary" };
  }
  if (toolName === StudyToolName.reasoningThinking) {
    return { stage: "synthesis", titleKey: "stepSynthesizeTitle", defaultSummaryKey: "stepSynthesizeSummary" };
  }
  if (toolName === StudyToolName.scoutTaskChat || toolName === StudyToolName.scoutSocialTrends) {
    return { stage: "discovery", titleKey: "stepScoutTitle", defaultSummaryKey: "stepScoutSummary" };
  }
  if (toolName === StudyToolName.searchPersonas || toolName === StudyToolName.buildPersona) {
    return { stage: "discovery", titleKey: "stepPersonaTitle", defaultSummaryKey: "stepPersonaSummary" };
  }
  if (toolName === StudyToolName.webSearch || toolName === StudyToolName.webFetch) {
    return { stage: "discovery", titleKey: "stepWebEvidenceTitle", defaultSummaryKey: "stepWebEvidenceSummary" };
  }
  return { stage: "synthesis", titleKey: "stepGenericTitle", defaultSummaryKey: "stepGenericSummary" };
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
    "Research Task"
  );
}

function getSubAgentTaskSummary(part: ToolUIPart): string {
  const output = getObjectPartOutput(part);
  if (part.state === "output-error") return part.errorText ?? "Execution failed.";
  if (part.state !== "output-available") return "In progress...";
  if (output?.status === "running") {
    return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "In progress...";
  }
  if (output?.status === "failed") {
    return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Execution failed.";
  }
  return compact(output?.resultSummary, TASK_SUMMARY_MAX_LEN) || "Completed.";
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

// Returns real content from tool output, or empty string when unavailable.
// Callers should fall back to t(defaultSummaryKey) for the empty-string case.
function extractSummaryForToolPart(part: StudyToolOrDynamicPart): string {
  if (part.state === "output-error") {
    return compact(part.errorText ?? "", STEP_SUMMARY_MAX_LEN);
  }
  if (part.state !== "output-available") {
    return "";
  }

  if (part.type === "dynamic-tool") {
    const dynamicText = compact(
      typeof part.output === "string" ? part.output : JSON.stringify(part.output),
      STEP_SUMMARY_MAX_LEN,
    );
    return isMeaninglessSummary(dynamicText) ? "" : dynamicText;
  }

  if (part.output && typeof part.output === "object") {
    const output = part.output as Record<string, unknown>;
    if ("plainText" in output && typeof output.plainText === "string") {
      const summaryFromPlainText = extractFirstSentence(output.plainText, STEP_SUMMARY_MAX_LEN);
      return isMeaninglessSummary(summaryFromPlainText) ? "" : summaryFromPlainText;
    }
  }

  const fallback = compact(JSON.stringify(part.output), STEP_SUMMARY_MAX_LEN);
  return isMeaninglessSummary(fallback) ? "" : fallback;
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
        titleKey: semantic.titleKey,
        defaultSummaryKey: semantic.defaultSummaryKey,
        summary: extractSummaryForToolPart(part),
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
