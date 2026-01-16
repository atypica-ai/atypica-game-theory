import { TUniversalMessageWithTool } from "./types";

/**
 * Universal Agent Tool UI Display
 * Renders tool call results in the chat UI
 */
export function UniversalToolUIPartDisplay({}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
}) {
  // For now, return null as we don't have custom UI for tools yet
  // Tools like webSearch, readFile, listSkills will show their results as text
  return null;
}
