import "server-only";

import { toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { ToolSet } from "ai";
import { listFilesTool } from "./listFiles";
import { listSkillsTool } from "./listSkills";
import { readFileTool } from "./readFile";

/**
 * Universal Agent Tool Set
 * Completely independent from Study tools
 */
export type UniversalToolSet = Partial<{
  [UniversalToolName.reasoningThinking]: ReturnType<typeof reasoningThinkingTool>;
  [UniversalToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [UniversalToolName.webFetch]: ReturnType<typeof webFetchTool>;
  [UniversalToolName.readFile]: ReturnType<typeof readFileTool>;
  [UniversalToolName.listFiles]: ReturnType<typeof listFilesTool>;
  [UniversalToolName.listSkills]: ReturnType<typeof listSkillsTool>;
  [UniversalToolName.toolCallError]: typeof toolCallError;
}>;

// Type check to ensure it conforms to AI SDK's ToolSet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UniversalToolSetCheck = UniversalToolSet extends ToolSet ? true : false;

/**
 * Build tool set for Universal Agent
 */
export function buildUniversalTools(
  params: { userId: number } & AgentToolConfigArgs,
): UniversalToolSet {
  const { userId, locale, abortSignal, statReport, logger } = params;
  const agentToolArgs: AgentToolConfigArgs = { locale, abortSignal, statReport, logger };

  return {
    [UniversalToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    [UniversalToolName.webSearch]: webSearchTool({ ...agentToolArgs }),
    [UniversalToolName.webFetch]: webFetchTool({ locale }),
    [UniversalToolName.readFile]: readFileTool({ userId }),
    [UniversalToolName.listFiles]: listFilesTool({ userId }),
    [UniversalToolName.listSkills]: listSkillsTool({ userId }),
    [UniversalToolName.toolCallError]: toolCallError,
  };
}

export { listFilesTool, listSkillsTool, readFileTool };
