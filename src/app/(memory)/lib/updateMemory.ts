import "server-only";

import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { prisma } from "@/prisma/prisma";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { Logger } from "pino";
import { memoryReorganizeSystemPrompt } from "../prompt/memoryReorganize";
import { memoryUpdateSystemPrompt } from "../prompt/memoryUpdate";
import { memoryNoUpdateTool } from "../tools/memoryNoUpdate";
import { memoryUpdateTool } from "../tools/memoryUpdate";
import { MemoryUpdateToolInput } from "../tools/memoryUpdate/types";
import { isMemoryThresholdMet } from "./utils";

const MEMORY_UPDATE_MODEL: LLMModelName = "claude-haiku-4-5";
const MEMORY_REORGANIZE_MODEL: LLMModelName = "claude-sonnet-4-5";

/**
 * Main function to update memory.
 * Handles all database operations (load, create, update).
 * Takes either userId OR teamId (mutually exclusive).
 */
export async function updateMemory({
  userId,
  teamId,
  conversationContext,
  logger,
}: {
  userId?: number;
  teamId?: number;
  conversationContext: ModelMessage[];
  logger: Logger;
}): Promise<void> {
  if (!userId && !teamId) {
    throw new Error("Either userId or teamId must be provided");
  }
  if (userId && teamId) {
    throw new Error("Cannot provide both userId and teamId");
  }

  try {
    // Load latest memory version
    let latestMemory = await prisma.memory.findFirst({
      where: userId ? { userId } : { teamId },
      orderBy: { version: "desc" },
      take: 1,
    });

    let currentContent = latestMemory?.core ?? "";
    let currentVersion = latestMemory?.version ?? 0;

    // Step 1: Reorganize if threshold exceeded
    if (isMemoryThresholdMet(currentContent, logger)) {
      const reorganizedContent = await reorganizeMemoryContent(currentContent, logger);

      // Create new version with reorganized content
      // ⚠️ NOTE: Concurrent reorganization may cause unique constraint violation on (userId/teamId, version)
      // This is acceptable as memory updates are infrequent and one request will succeed
      const newVersion = currentVersion + 1;
      latestMemory = await prisma.memory.create({
        data: {
          userId: userId ?? null,
          teamId: teamId ?? null,
          version: newVersion,
          core: reorganizedContent,
          working: [],
          changeNotes: `Reorganized memory from ${currentContent.length} to ${reorganizedContent.length} characters`,
          extra: {},
        },
      });

      logger.info({
        msg: "Memory reorganized",
        userId,
        teamId,
        oldLength: currentContent.length,
        newLength: reorganizedContent.length,
        version: newVersion,
      });

      // Update current content and version for next step
      currentContent = reorganizedContent;
      currentVersion = newVersion;
    }

    // Step 2: Always update with new information from conversation
    const updatedContent = await updateMemoryContent(currentContent, conversationContext, logger);

    // Update latest version with new content
    if (latestMemory) {
      // Update existing version
      latestMemory = await prisma.memory.update({
        where: { id: latestMemory.id },
        data: {
          core: updatedContent,
          changeNotes: `Updated: added new information from conversation`,
        },
      });
    } else {
      // Create first version
      latestMemory = await prisma.memory.create({
        data: {
          userId: userId ?? null,
          teamId: teamId ?? null,
          version: 1,
          core: updatedContent,
          working: [],
          changeNotes: "Initial memory created",
          extra: {},
        },
      });
    }

    logger.info({
      msg: "Memory updated successfully",
      userId,
      teamId,
      contentLength: updatedContent.length,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to update memory",
      userId,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - fail gracefully
  }
}

/**
 * Reorganize memory content using LLM.
 * Pure function: takes content, returns reorganized content.
 * @todo get locale from context or user settings
 */
export async function reorganizeMemoryContent(
  currentContent: string,
  logger: Logger,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const locale = "en-US";

  const result = await generateText({
    model: llm(MEMORY_REORGANIZE_MODEL),
    providerOptions: defaultProviderOptions,
    system: memoryReorganizeSystemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: currentContent }],
      },
    ],
  });

  const reorganizedContent = result.text.trim();

  // Report token usage
  const tokens = result.usage.totalTokens || 0;
  logger.info({
    msg: "Memory reorganize agent completed",
    tokens,
    usage: result.usage,
  });

  return reorganizedContent;
}

/**
 * Update memory content by extracting information from conversation.
 * Pure function: takes content and conversation, returns updated content.
 * @todo get locale from context or user settings
 */
async function updateMemoryContent(
  currentContent: string,
  conversationContext: ModelMessage[],
  logger: Logger,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const locale = "en-US";
  const isNewMemory = currentContent.length === 0;

  // Prepare messages for the agent
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: isNewMemory
            ? `Conversation context:\n${JSON.stringify(conversationContext, null, 2)}\n\nThere is no memory yet. Please extract key information from the conversation that should be remembered and create the first version of memory.`
            : `Current memory content:\n\`\`\`\n${currentContent}\n\`\`\`\n\nConversation context:\n${JSON.stringify(conversationContext, null, 2)}`,
        },
      ],
    },
  ];

  // Call memory update agent (allow multiple tool calls)
  const result = await generateText({
    model: llm(MEMORY_UPDATE_MODEL),
    providerOptions: defaultProviderOptions,
    tools: {
      memoryUpdate: memoryUpdateTool(),
      memoryNoUpdate: memoryNoUpdateTool(),
    },
    system: memoryUpdateSystemPrompt,
    messages,
    toolChoice: "required",
    stopWhen: stepCountIs(5), // Allow up to 5 tool calls for extracting multiple memory items
  });

  // Extract tool results
  // const toolResults = result.toolResults; // ⚠️ toolResults 只是最后一步的，不能这么取，得是遍历 steps
  const toolResults = result.steps.flatMap((step) => step.toolResults ?? []);
  const memoryUpdateResults = toolResults?.filter((r) => r.toolName === "memoryUpdate");
  const memoryNoUpdateResult = toolResults?.find((r) => r.toolName === "memoryNoUpdate");

  // If no update is needed, return current content unchanged
  if (memoryNoUpdateResult) {
    logger.info({
      msg: "Memory no-update tool called - no information to remember",
    });
    return currentContent;
  }

  if (!memoryUpdateResults || memoryUpdateResults.length === 0) {
    throw new Error(
      `Memory update agent did not call the required tool. Text output: ${result.text.substring(0, 200)}`,
    );
  }

  logger.info({
    msg: "Memory update tools called",
    count: memoryUpdateResults.length,
  });

  // Apply all memory updates sequentially
  let updatedContent = currentContent;

  for (const memoryUpdateResult of memoryUpdateResults) {
    const toolInput = memoryUpdateResult.input as MemoryUpdateToolInput;
    const { lineIndex, newLine } = toolInput;

    logger.info({
      msg: "Applying memory update",
      lineIndex,
      newLinePreview: newLine.substring(0, 50),
    });

    // Apply transformation: insert new line at specified index
    updatedContent = applyMemoryUpdate(updatedContent, lineIndex, newLine);
  }

  // Report token usage
  const tokens = result.usage.totalTokens || 0;
  logger.info({
    msg: "Memory update agent completed",
    tokens,
    usage: result.usage,
  });

  return updatedContent;
}

/**
 * Apply a single memory update to the content.
 * Pure function: takes current content, line index, and new line, returns updated content.
 */
function applyMemoryUpdate(currentContent: string, lineIndex: number, newLine: string): string {
  if (currentContent.length === 0) {
    // Empty memory: just set to newLine
    return newLine;
  }

  // Non-empty memory: insert at specified line index
  const lines = currentContent.split("\n");

  // Validate lineIndex
  if (lineIndex < -1 || lineIndex >= lines.length) {
    throw new Error(
      `Invalid lineIndex: ${lineIndex}. Must be -1 (append) or between 0 and ${lines.length - 1}.`,
    );
  }

  // Insert new line
  if (lineIndex === -1) {
    // Append at end
    lines.push(newLine);
  } else {
    // Insert after specified line
    lines.splice(lineIndex + 1, 0, newLine);
  }

  return lines.join("\n");
}
