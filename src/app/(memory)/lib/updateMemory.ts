import "server-only";

import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { prisma } from "@/prisma/prisma";
import { generateText, ModelMessage, stepCountIs } from "ai";
import { Logger } from "pino";
import { memoryUpdateSystemPrompt } from "../prompt/memoryUpdate";
import { memoryNoUpdateTool } from "../tools/memoryNoUpdate";
import { memoryUpdateTool } from "../tools/memoryUpdate";
import { MemoryUpdateToolInput } from "../tools/memoryUpdate/types";
import { reorganizeMemoryWithCore } from "./reorganizeMemory";
import { isMemoryThresholdMet } from "./utils";

const MEMORY_UPDATE_MODEL: LLMModelName = "minimax-m2.1";

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

    // Both personal and team: read from working (string[]).
    const workingLines = Array.isArray(latestMemory?.working) ? latestMemory.working : [];
    let currentContent = workingLines.join("\n");
    let currentVersion = latestMemory?.version ?? 0;

    // Step 1: Reorganize if threshold exceeded
    if (isMemoryThresholdMet(currentContent, logger)) {
      const currentCore = latestMemory?.core ?? "";
      const newCore = await reorganizeMemoryWithCore(currentCore, currentContent, logger);

      // Create new version: updated core + working fully cleared.
      // ⚠️ NOTE: Concurrent reorganization may cause unique constraint violation on (userId/teamId, version)
      // This is acceptable as memory updates are infrequent and one request will succeed
      const newVersion = currentVersion + 1;
      latestMemory = await prisma.memory.create({
        data: {
          userId: userId ?? null,
          teamId: teamId ?? null,
          version: newVersion,
          core: newCore,
          working: [],
          changeNotes: `Reorganized: promoted permanent items to core, cleared working (core ${currentCore.length}→${newCore.length} chars, working ${currentContent.length} chars cleared)`,
          extra: {},
        },
      });

      logger.info({
        msg: "Memory reorganized (v2)",
        userId,
        teamId,
        oldCoreLength: currentCore.length,
        newCoreLength: newCore.length,
        oldWorkingLength: currentContent.length,
        version: newVersion,
      });

      // Working is cleared — step 2 starts fresh
      currentContent = "";
      currentVersion = newVersion;
    }

    // Step 2: Always update with new information from conversation
    const updatedContent = await updateMemoryContent(currentContent, conversationContext, logger);

    const workingLinesFromContent = updatedContent.split("\n").filter((l) => l.trim() !== "");

    // Update latest version with new content (both personal and team: write to working)
    if (latestMemory) {
      latestMemory = await prisma.memory.update({
        where: { id: latestMemory.id },
        data: {
          working: workingLinesFromContent,
          changeNotes: `Updated: added new information from conversation`,
        },
      });
    } else {
      latestMemory = await prisma.memory.create({
        data: {
          userId: userId ?? null,
          teamId: teamId ?? null,
          version: 1,
          core: "",
          working: workingLinesFromContent,
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
    providerOptions: defaultProviderOptions(),
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
    const { operation, lineIndex, newLine } = toolInput;

    logger.info({
      msg: "Applying memory update",
      operation,
      lineIndex,
      newLinePreview: newLine?.substring(0, 50),
    });

    // Apply transformation based on operation type
    updatedContent = applyMemoryUpdate(updatedContent, operation, lineIndex, newLine);
  }

  // Clean up [DELETED] markers before returning
  const cleaned = updatedContent
    .split("\n")
    .filter((line) => line.trim() !== "- [DELETED]")
    .join("\n");

  // Report token usage
  const tokens = result.usage.totalTokens || 0;
  logger.info({
    msg: "Memory update agent completed",
    tokens,
    usage: result.usage,
    deletedLines: updatedContent.split("\n").length - cleaned.split("\n").length,
  });

  return cleaned;
}

/**
 * Apply a single memory update to the content.
 * Pure function: takes current content, operation type, line index, and new line, returns updated content.
 */
function applyMemoryUpdate(
  currentContent: string,
  operation: "append" | "replace" | "delete",
  lineIndex: number | undefined,
  newLine: string | undefined,
): string {
  if (currentContent.length === 0) {
    // Empty memory: only append is valid
    if (operation !== "append" || !newLine) {
      throw new Error("Empty memory can only be initialized with append operation");
    }
    return newLine;
  }

  const lines = currentContent.split("\n");

  switch (operation) {
    case "append": {
      if (!newLine) {
        throw new Error("newLine is required for append operation");
      }
      lines.push(newLine);
      break;
    }

    case "replace": {
      if (lineIndex === undefined || lineIndex < 0 || lineIndex >= lines.length) {
        throw new Error(
          `Invalid lineIndex for replace: ${lineIndex}. Must be between 0 and ${lines.length - 1}.`,
        );
      }
      if (!newLine) {
        throw new Error("newLine is required for replace operation");
      }
      lines[lineIndex] = newLine;
      break;
    }

    case "delete": {
      if (lineIndex === undefined || lineIndex < 0 || lineIndex >= lines.length) {
        throw new Error(
          `Invalid lineIndex for delete: ${lineIndex}. Must be between 0 and ${lines.length - 1}.`,
        );
      }
      // Mark line as deleted instead of removing it (to preserve line indices during batch operations)
      lines[lineIndex] = "- [DELETED]";
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return lines.join("\n");
}
