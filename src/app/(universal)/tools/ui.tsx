"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { UpdatePanelResultMessage } from "@/app/(panel)/tools/updatePanel/UpdatePanelResultMessage";
import type { ConfirmPanelResearchPlanInput } from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { GeneratePodcastResultMessage } from "@/app/(study)/tools/generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "@/app/(study)/tools/generateReport/GenerateReportResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { ConfirmPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPlanMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDot, CircleX } from "lucide-react";
import { TAddUniversalUIToolResult, TUniversalMessageWithTool, UniversalToolName } from "./types";

function extractPlainText(toolUIPart: TUniversalMessageWithTool["parts"][number]): string {
  if (!("output" in toolUIPart) || !toolUIPart.output || typeof toolUIPart.output !== "object") {
    return "";
  }
  const output = toolUIPart.output as Record<string, unknown>;
  return typeof output.plainText === "string" ? output.plainText : "";
}

function UniversalMajorTaskResultCard({
  title,
  summary,
  onOpenDetail,
}: {
  title: string;
  summary: string;
  onOpenDetail: () => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/20">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className={cn("text-sm text-muted-foreground", summary ? "line-clamp-4" : "")}>
        {summary || "Done. Open details in right panel."}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onOpenDetail}>
        View details
      </Button>
    </div>
  );
}

function getSubAgentCardStatus(
  toolUIPart: Extract<TUniversalMessageWithTool["parts"][number], { type: `tool-${string}` }>,
): "running" | "done" | "error" {
  if (toolUIPart.state === "output-error") return "error";
  if (toolUIPart.state !== "output-available") return "running";
  if (toolUIPart.output && typeof toolUIPart.output === "object") {
    const output = toolUIPart.output as Record<string, unknown>;
    if (output.status === "failed") return "error";
    if (output.status === "running") return "running";
  }
  return "done";
}

function extractSubAgentTitle(
  toolUIPart: Extract<TUniversalMessageWithTool["parts"][number], { type: `tool-${string}` }>,
): string {
  if (!toolUIPart.input || typeof toolUIPart.input !== "object") return "SubAgent Task";
  const input = toolUIPart.input as Record<string, unknown>;
  if (typeof input.subAgentTitle === "string" && input.subAgentTitle.trim()) {
    return input.subAgentTitle.trim();
  }
  if (typeof input.taskRequirement === "string" && input.taskRequirement.trim()) {
    return input.taskRequirement.trim();
  }
  return "SubAgent Task";
}

function extractSubAgentSummary(
  toolUIPart: Extract<TUniversalMessageWithTool["parts"][number], { type: `tool-${string}` }>,
): string {
  if (toolUIPart.state === "output-error") {
    return toolUIPart.errorText || "Sub-agent execution failed.";
  }
  if (toolUIPart.state !== "output-available") {
    return "Sub-agent is preparing and will stream progress shortly.";
  }
  if (!toolUIPart.output || typeof toolUIPart.output !== "object") {
    return "Sub-agent task created.";
  }
  const output = toolUIPart.output as Record<string, unknown>;
  if (typeof output.resultSummary === "string" && output.resultSummary.trim()) {
    return output.resultSummary.trim();
  }
  return "Sub-agent task created.";
}

type SubAgentToolUIPart = Extract<
  TUniversalMessageWithTool["parts"][number],
  { type: `tool-${UniversalToolName.createStudySubAgent}` }
>;

function getSubAgentStatusLabel(status: "running" | "done" | "error"): string {
  if (status === "running") return "Running";
  if (status === "done") return "Done";
  return "Error";
}

function UniversalSubAgentTaskCard({
  toolUIPart,
  onOpenDetail,
  statusOverride,
}: {
  toolUIPart: SubAgentToolUIPart;
  onOpenDetail: () => void;
  statusOverride?: "running" | "done" | "error";
}) {
  const status = statusOverride ?? getSubAgentCardStatus(toolUIPart);
  const title = extractSubAgentTitle(toolUIPart);
  const summary = extractSubAgentSummary(toolUIPart);

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full rounded-md border p-3 text-left space-y-2 bg-muted/20 hover:bg-muted/35 transition-colors"
    >
      <div className="flex items-center gap-2">
        {status === "running" ? (
          <CircleDot className="size-3.5 text-amber-500 animate-pulse" />
        ) : status === "done" ? (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        ) : (
          <CircleX className="size-3.5 text-red-500" />
        )}
        <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">{title}</div>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground">
          {getSubAgentStatusLabel(status)}
        </span>
      </div>
      <div className={cn("text-sm text-muted-foreground", summary ? "line-clamp-3" : "")}>{summary}</div>
      <div className="text-xs text-primary">Open task progress</div>
    </button>
  );
}

export function renderUniversalSubAgentCardsInMessage({
  message,
  onOpenTaskDetail,
  statusByToolCallId,
}: {
  message: Pick<TUniversalMessageWithTool, "role" | "parts">;
  onOpenTaskDetail: (payload: { toolCallId: string; toolName: string }) => void;
  statusByToolCallId?: Record<string, "running" | "done" | "error">;
}) {
  if (message.role !== "assistant") return null;

  const subAgentParts = message.parts.filter(
    (part): part is SubAgentToolUIPart =>
      part.type === `tool-${UniversalToolName.createStudySubAgent}`,
  );

  if (subAgentParts.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {subAgentParts.map((part) => (
        <UniversalSubAgentTaskCard
          key={part.toolCallId}
          toolUIPart={part}
          statusOverride={statusByToolCallId?.[part.toolCallId]}
          onOpenDetail={() =>
            onOpenTaskDetail({
              toolCallId: part.toolCallId,
              toolName: UniversalToolName.createStudySubAgent,
            })
          }
        />
      ))}
    </div>
  );
}

/**
 * Universal Agent Tool UI Display
 * Renders tool call results in the chat UI.
 * Components are defined in their respective modules (Panel, etc.),
 * this file only dispatches to them.
 */
export function UniversalToolUIPartDisplay({
  toolUIPart,
  addToolResult,
  onOpenReport,
  onOpenTaskDetail,
  interactiveOnly = false,
}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
  addToolResult?: TAddUniversalUIToolResult;
  onOpenReport?: (payload: { toolCallId: string; reportToken: string }) => void;
  onOpenTaskDetail?: (payload: { toolCallId: string; toolName: string }) => void;
  interactiveOnly?: boolean;
}) {
  if (!("toolCallId" in toolUIPart)) {
    return null;
  }

  // Phase 1: Interactive tools — render before output is available
  switch (toolUIPart.type) {
    case `tool-${UniversalToolName.requestSelectPersonas}`:
      return (
        <RequestSelectPersonasMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />
      );
    case `tool-${UniversalToolName.confirmPanelResearchPlan}`:
      return (
        <ConfirmPanelResearchPlanMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />
      );
  }

  // Phase 2: Display-only tools — render only when output is available
  if (interactiveOnly) {
    return null;
  }

  if (toolUIPart.state !== "output-available") {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-${UniversalToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolUIPart} />;
    case `tool-${UniversalToolName.generateReport}`:
      return (
        <GenerateReportResultMessage toolInvocation={toolUIPart} onClickReport={onOpenReport} />
      );
    case `tool-${UniversalToolName.generatePodcast}`:
      return onOpenTaskDetail ? (
        <UniversalMajorTaskResultCard
          title="Generate Podcast"
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={() =>
            onOpenTaskDetail({ toolCallId: toolUIPart.toolCallId, toolName: UniversalToolName.generatePodcast })
          }
        />
      ) : (
        <GeneratePodcastResultMessage toolInvocation={toolUIPart} />
      );
    case `tool-${UniversalToolName.interviewChat}`:
      return onOpenTaskDetail ? (
        <UniversalMajorTaskResultCard
          title="Persona Interview"
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={() =>
            onOpenTaskDetail({ toolCallId: toolUIPart.toolCallId, toolName: UniversalToolName.interviewChat })
          }
        />
      ) : null;
    case `tool-${UniversalToolName.discussionChat}`:
      return onOpenTaskDetail ? (
        <UniversalMajorTaskResultCard
          title="Focus Group Discussion"
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={() =>
            onOpenTaskDetail({ toolCallId: toolUIPart.toolCallId, toolName: UniversalToolName.discussionChat })
          }
        />
      ) : null;
    case `tool-${UniversalToolName.deepResearch}`:
      return onOpenTaskDetail ? (
        <UniversalMajorTaskResultCard
          title="Deep Research"
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={() =>
            onOpenTaskDetail({ toolCallId: toolUIPart.toolCallId, toolName: UniversalToolName.deepResearch })
          }
        />
      ) : null;
    case `tool-${UniversalToolName.updatePanel}`:
      return <UpdatePanelResultMessage toolInvocation={toolUIPart} />;
  }

  return null;
}
