"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { UpdatePanelResultMessage } from "@/app/(panel)/tools/updatePanel/UpdatePanelResultMessage";
import { GeneratePodcastResultMessage } from "@/app/(study)/tools/generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "@/app/(study)/tools/generateReport/GenerateReportResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { TAddUniversalUIToolResult, TUniversalMessageWithTool, UniversalToolName } from "./types";

/**
 * Universal Agent Tool UI Display
 * Renders tool call results in the chat UI.
 * Components are defined in their respective modules (Panel, etc.),
 * this file only dispatches to them.
 */
export function UniversalToolUIPartDisplay({
  toolUIPart,
  addToolResult,
}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
  addToolResult?: TAddUniversalUIToolResult;
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
      return <GenerateReportResultMessage toolInvocation={toolUIPart} />;
    case `tool-${UniversalToolName.generatePodcast}`:
      return <GeneratePodcastResultMessage toolInvocation={toolUIPart} />;
    case `tool-${UniversalToolName.updatePanel}`:
      return <UpdatePanelResultMessage toolInvocation={toolUIPart} />;
  }

  return null;
}
