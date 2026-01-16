import { UIDataTypes, UIMessage } from "ai";
import { ExportFolderInput, ExportFolderOutput } from "./exportFolder/types";

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

  // Export sandbox files
  exportFolder = "exportFolder",

  // Skill management
  listSkills = "listSkills",

  // Error handling
  toolCallError = "toolCallError",
}

/**
 * Universal Agent UI Tools
 * Maps tool names to their input/output types for UI rendering
 */
export type UniversalUITools = {
  [UniversalToolName.exportFolder]: { input: ExportFolderInput; output: ExportFolderOutput };
  // Add other tools here as needed
};

export type TUniversalMessageWithTool = UIMessage<unknown, UIDataTypes, UniversalUITools>;
