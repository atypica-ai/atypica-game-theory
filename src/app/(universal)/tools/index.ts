import "server-only";

import { toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { Tool, ToolSet } from "ai";
import { exportFolderTool } from "./exportFolder";
import { listSkillsTool } from "./listSkills";

/**
 * bash-tool CommandResult type
 */
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Universal Agent Tool Set
 * Completely independent from Study tools
 */
export type UniversalToolSet = Partial<{
  [UniversalToolName.reasoningThinking]: ReturnType<typeof reasoningThinkingTool>;
  [UniversalToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [UniversalToolName.webFetch]: ReturnType<typeof webFetchTool>;
  [UniversalToolName.bash]: Tool<{ command: string }, CommandResult>;
  [UniversalToolName.readFile]: Tool<{ path: string }, { content: string }>;
  [UniversalToolName.writeFile]: Tool<{ path: string; content: string }, { success: boolean }>;
  [UniversalToolName.exportFolder]: ReturnType<typeof exportFolderTool>;
  [UniversalToolName.listSkills]: ReturnType<typeof listSkillsTool>;
  [UniversalToolName.toolCallError]: typeof toolCallError;
}>;

// Type check to ensure it conforms to AI SDK's ToolSet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UniversalToolSetCheck = UniversalToolSet extends ToolSet ? true : false;

/**
 * Build tool set for Universal Agent (without bash-tool, those are added separately)
 */
export function buildUniversalTools(
  params: { userId: number } & AgentToolConfigArgs,
): Omit<UniversalToolSet, UniversalToolName.bash | UniversalToolName.readFile | UniversalToolName.writeFile> {
  const { userId, locale, abortSignal, statReport, logger } = params;
  const agentToolArgs: AgentToolConfigArgs = { locale, abortSignal, statReport, logger };

  return {
    [UniversalToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    [UniversalToolName.webSearch]: webSearchTool({ ...agentToolArgs }),
    [UniversalToolName.webFetch]: webFetchTool({ locale }),
    [UniversalToolName.listSkills]: listSkillsTool({ userId }),
    [UniversalToolName.toolCallError]: toolCallError,
  };
}

export { listSkillsTool };
