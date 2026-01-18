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

  // Currently no custom UI for any tools, showing default text display
  return null;
}
