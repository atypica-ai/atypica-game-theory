import { UIDataTypes, UIMessage } from "ai";

/**
 * Universal Agent Tool Names
 * Completely independent from Study tools
 */
export enum UniversalToolName {
  // Core thinking and reasoning
  reasoningThinking = "reasoningThinking",

  // Web capabilities
  webSearch = "webSearch",
  webFetch = "webFetch",

  // bash-tool: Skill filesystem operations (in-memory sandbox)
  bash = "bash",
  readFile = "readFile",
  writeFile = "writeFile",

  // Skill management
  listSkills = "listSkills",

  // Error handling
  toolCallError = "toolCallError",
}

/**
 * Universal Agent UI Tools
 * Maps tool names to their input/output types for UI rendering
 * Currently empty - use Record<string, never> instead of {}
 */
export type UniversalUITools = Record<string, never>;

export type TUniversalMessageWithTool = UIMessage<unknown, UIDataTypes, UniversalUITools>;
