import "server-only";

import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { generateText } from "ai";
import { Logger } from "pino";
import { memoryReorganizeSystemPrompt } from "../prompt/memoryReorganize";
import { memoryReorganizeV2SystemPrompt } from "../prompt/memoryReorganizeV2";

const MEMORY_REORGANIZE_MODEL: LLMModelName = "claude-sonnet-4-5";

/**
 * V2: Cross-reference core and working memory.
 * Promotes permanent, identity-level items from working into core (editing existing entries where relevant).
 * Working memory is always fully cleared after reorganization — this function only returns the updated core.
 *
 * Pure function: takes core + working content, returns updated core.
 */
export async function reorganizeMemoryWithCore(
  coreMemory: string,
  workingMemory: string,
  logger: Logger,
): Promise<string> {
  const result = await generateText({
    model: llm(MEMORY_REORGANIZE_MODEL),
    providerOptions: defaultProviderOptions(),
    system: memoryReorganizeV2SystemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `## Current Core Memory\n${coreMemory.trim() || "(empty)"}\n\n## Current Working Memory\n${workingMemory}`,
          },
        ],
      },
    ],
  });

  logger.info({
    msg: "Memory reorganize v2 agent completed",
    tokens: result.usage.totalTokens || 0,
    usage: result.usage,
  });

  return result.text.trim();
}

/**
 * @deprecated Use reorganizeMemoryWithCore instead.
 *
 * V1 reorganization: only cleaned and pruned working memory (keeping [Profile] and [Preference]).
 * Did not touch core memory.
 *
 * Superseded by reorganizeMemoryWithCore (v2), which cross-references both core and working,
 * promotes permanent items into core, and clears working entirely.
 *
 * Kept here as historical reference.
 *
 * Pure function: takes working content, returns cleaned working content.
 */
export async function reorganizeMemoryContent(
  currentContent: string,
  logger: Logger,
): Promise<string> {
  const result = await generateText({
    model: llm(MEMORY_REORGANIZE_MODEL),
    providerOptions: defaultProviderOptions(),
    system: memoryReorganizeSystemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: currentContent }],
      },
    ],
  });

  const reorganizedContent = result.text.trim();

  logger.info({
    msg: "Memory reorganize v1 agent completed",
    tokens: result.usage.totalTokens || 0,
    usage: result.usage,
  });

  return reorganizedContent;
}
