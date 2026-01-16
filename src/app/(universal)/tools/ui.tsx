import { ExportFolderResultMessage } from "./ExportFolderResultMessage";
import { UniversalToolName } from "./types";
import { TUniversalMessageWithTool } from "./types";

/**
 * Universal Agent Tool UI Display
 * Renders tool call results in the chat UI
 */
export function UniversalToolUIPartDisplay({
  toolUIPart,
}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
}) {
  // Only render for tool parts
  if (!("toolCallId" in toolUIPart)) {
    return null;
  }

  // Only show custom UI for tools with output available
  if (toolUIPart.state !== "output-available") return null;

  // Render specific tool UI based on tool type
  switch (toolUIPart.type) {
    case `tool-${UniversalToolName.exportFolder}`:
      return <ExportFolderResultMessage toolInvocation={toolUIPart} />;
    default:
      // For other tools, return null to show default text display
      return null;
  }
}
