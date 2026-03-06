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
}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
  addToolResult?: TAddUniversalUIToolResult;
  onOpenReport?: (payload: { toolCallId: string; reportToken: string }) => void;
  onOpenTaskDetail?: (payload: { toolCallId: string; toolName: string }) => void;
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
