import { TMessageWithPlainTextTool } from "@/ai/tools/types";

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

  // Skill filesystem (in-memory)
  readFile = "readFile",
  listFiles = "listFiles",

  // Skill management
  listSkills = "listSkills",

  // Error handling
  toolCallError = "toolCallError",
}

export type TUniversalMessageWithTool = TMessageWithPlainTextTool;
