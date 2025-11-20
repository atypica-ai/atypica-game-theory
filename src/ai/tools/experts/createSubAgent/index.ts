import "server-only";

import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { defaultProviderOptions, llm } from "@/ai/provider";
import type { MCPClient } from "@/ai/tools/mcp/client";
import { handleToolCallError } from "@/ai/tools/tools";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import {
  generateId,
  generateObject,
  smoothStream,
  stepCountIs,
  streamText,
  TextStreamPart,
  tool,
  ToolSet,
} from "ai";
import { Logger } from "pino";
import z from "zod/v3";
import {
  createSubAgentInputSchema,
  createSubAgentOutputSchema,
  type CreateSubAgentResult,
} from "./types";

const MAX_STEPS = 20; // Allow up to 20 steps for the sub-agent to complete the task

export const createBackgroundToken = async ({
  toolUserChatId,
  toolLog,
}: {
  toolUserChatId: number;
  toolLog: Logger;
}) => {
  const backgroundToken = new Date().valueOf().toString();
  try {
    await prisma.userChat.update({
      where: { id: toolUserChatId, kind: "misc" },
      data: { backgroundToken },
    });
  } catch (error) {
    toolLog.error(`Error setting background token ${backgroundToken}: ${(error as Error).message}`);
    throw error;
  }
  const clearBackgroundToken = async () => {
    try {
      // mark as background running end
      await prisma.userChat.update({
        where: { id: toolUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      toolLog.warn(
        `Error clearing background token ${backgroundToken}: ${(error as Error).message}`,
      );
    }
  };

  return { clearBackgroundToken };
};

/**
 * Tool selection schema for Gemini
 */
const toolSelectionSchema = z.object({
  selectedMcpNames: z
    .array(z.string())
    .describe("List of MCP server names that should be used for this task"),
});

/**
 * endSubAgent tool schema - allows sub-agent to output final result
 */
const endSubAgentToolSchema = z.object({
  result: z
    .string()
    .describe(
      "The final result of the task. This should be the complete output that satisfies the task requirement and output format.",
    ),
});

/**
 * Step 1: Select MCP tools using Gemini 2.5 Flash
 */
async function selectMcpTools({
  taskRequirement,
  clients,
  locale,
  logger,
  abortSignal,
  statReport,
}: {
  taskRequirement: string;
  clients: MCPClient[];
} & AgentToolConfigArgs): Promise<string[]> {
  if (clients.length === 0) {
    logger.warn("No MCP servers available for tool selection");
    return [];
  }

  // Build MCP metadata in markdown format, distinctly separating each MCP
  // Fetch metadata in parallel for all clients
  const metadataPromises = clients.map((client) => client.getMetadata());
  const metadataResults = await Promise.allSettled(metadataPromises);

  const mcpInfoText = metadataResults
    .map((result, index) => {
      if (result.status !== "fulfilled") {
        return null;
      }
      const mcp = result.value;
      const toolsInfo = mcp.tools
        .map(
          (toolName) =>
            `  - **${toolName}**: ${mcp.toolDescriptions[toolName] || "No description"}`,
        )
        .join("\n");
      return `## ${index + 1}. ${mcp.name}\n\n**Available Tools**:\n${toolsInfo}`;
    })
    .filter((text): text is string => text !== null)
    .join("\n\n---\n\n");
  const systemPrompt =
    locale === "zh-CN"
      ? `你是一个工具选择专家。你的任务是根据用户提供的任务需求，从可用的 MCP 服务器中选择最合适的工具来完成该任务。分析任务需求，选择能够完成此任务所需的 MCP 服务器，并返回一个包含所选 MCP 服务器名称的列表。`
      : `You are a tool selection expert. Your task is to select the most appropriate tools from available MCP servers based on the user's task requirement. Analyze the task requirement and select the MCP servers needed to complete this task. Return a list of selected MCP server names.`;

  const userMessage =
    locale === "zh-CN"
      ? `<任务需求>
${taskRequirement}
</任务需求>

<可用的 MCP 服务器>
${mcpInfoText}
</可用的 MCP 服务器>

请根据任务需求，选择能够完成此任务所需的 MCP 服务器。返回一个包含所选 MCP 服务器名称的列表。`
      : `<Task Requirement>
${taskRequirement}
</Task Requirement>

<Available MCP Servers>
${mcpInfoText}
</Available MCP Servers>

Please analyze the task requirement and select the MCP servers needed to complete this task. Return a list of selected MCP server names.`;

  try {
    const result = await generateObject({
      model: llm("gemini-2.5-flash"),
      schema: toolSelectionSchema,
      system: systemPrompt,
      prompt: userMessage,
      maxRetries: 2,
      abortSignal,
    });

    logger.info(
      {
        selectedMcpNames: result.object.selectedMcpNames,
        totalAvailable: clients.length,
      },
      "MCP tool selection completed",
    );

    if (statReport) {
      const { tokens, extra } = calculateStepTokensUsage(result);
      await statReport("tokens", tokens, {
        reportedBy: "createSubAgent tool selection",
        ...extra,
      });
    }

    return result.object.selectedMcpNames;
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      "Failed to select MCP tools, falling back to all available tools",
    );
    // Fallback: return all MCP names
    return clients.map((client) => client.getName());
  }
}

/**
 * Step 2: Run sub-agent with selected MCP tools
 */
async function runSubAgentStream({
  subAgentChatId,
  clients,
  taskRequirement,
  outputFormat,
  selectedMcpNames,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  subAgentChatId: number;
  clients: MCPClient[];
  taskRequirement: string;
  outputFormat: string;
  selectedMcpNames: string[];
} & AgentToolConfigArgs): Promise<string> {
  const selectedClients: MCPClient[] = [];

  // Get selected clients
  for (const name of selectedMcpNames) {
    const client = clients.find((client) => client.getName() === name);
    if (client) {
      selectedClients.push(client);
    }
  }

  if (selectedClients.length === 0) {
    logger.warn("No MCP clients found for selected names, proceeding without tools");
  }

  // Collect tools from selected clients
  const selectedTools = {} as ToolSet;
  const toolPromises = selectedClients.map(async (client) => {
    const tools = await client.getTools();
    return { client, tools };
  });
  const toolResults = await Promise.allSettled(toolPromises);

  for (const result of toolResults) {
    if (result.status === "fulfilled") {
      const { tools } = result.value;
      Object.assign(selectedTools, tools);
    }
  }

  if (Object.keys(selectedTools).length === 0) {
    logger.warn("No tools found for selected MCPs, proceeding without tools");
  }

  // Add endSubAgent tool to allow sub-agent to output final result
  const endSubAgentTool = tool({
    description:
      locale === "zh-CN"
        ? "当任务完成时，调用此工具输出最终结果。这是唯一的方式来表示任务已完成并返回结果。"
        : "Call this tool when the task is complete to output the final result. This is the only way to indicate task completion and return the result.",
    inputSchema: endSubAgentToolSchema,
    execute: async ({ result }) => {
      // This tool just returns the result - we'll extract it from the tool call input
      return { success: true, result };
    },
  });
  selectedTools.endSubAgent = endSubAgentTool;

  // Collect prompt contents from selected MCP clients in parallel
  const mcpPromptPromises = selectedClients.map(async (client) => {
    try {
      const promptContents = await client.getPromptContents();
      if (!promptContents || promptContents.trim().length === 0) {
        return null;
      }
      // Format with MCP name header for clarity
      const mcpName = client.getName();
      return `### ${mcpName}\n${promptContents}`;
    } catch (error) {
      logger.warn(
        { mcpName: client.getName(), error: (error as Error).message },
        "Failed to get prompt contents from MCP client",
      );
      return null;
    }
  });

  const mcpPromptResults = await Promise.allSettled(mcpPromptPromises);
  const mcpPrompts = mcpPromptResults
    .filter(
      (result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((prompt): prompt is string => prompt !== null);

  // TODO: move system prompt to prompt repo
  const baseSystemPrompt = promptSystemConfig({ locale });
  const systemPrompt =
    locale === "zh-CN"
      ? `${baseSystemPrompt}
# 角色
你是一个诚实、仔细、负责人、专业的任务执行代理。你的任务是使用提供的工具完成用户的需求，并按照指定的格式输出结果。

${mcpPrompts.length > 0 ? `\n## 可用的工具和上下文\n${mcpPrompts.join("\n\n")}\n` : ""}

# 执行原则
- 仔细理解任务需求和输出格式要求
- 合理使用提供的工具完成任务
- 诚实性原则：诚实面对自己的能力边界，如果你拥有的工具和资源无法有效回答用户需求（比如没有完成任务的工具或者没有回答问题的数据），请诚实地告诉用户，不要试图编造或欺骗用户。
- **当任务完成时，必须调用 endSubAgent 工具输出最终结果**，不要直接输出文本。
- 结果必须符合输出格式要求。如果某个或者全部输出项无法回答，请诚实地告诉用户，不要试图编造或欺骗用户。
- 只有在任务真正完成时才调用 endSubAgent，在此之前继续使用其他工具
`
      : `${baseSystemPrompt}
You are a honest, careful, responsible, professional task execution agent. Your task is to use the provided tools to complete the user's requirements and output results in the specified format.

${mcpPrompts.length > 0 ? `\n## Available Tools and Context\n${mcpPrompts.join("\n\n")}\n` : ""}

# Execution Principles
- Carefully understand the task requirement and output format requirements
- Use the provided tools appropriately to complete the task
- Honesty principle: Be honest about your ability boundaries. If you don't have the tools or data to effectively answer the user's request (e.g., no tool to complete the task or no data to answer the question), tell the user honestly. Do not attempt to fabricate or deceive the user.
- **When the task is complete, you MUST call the endSubAgent tool to output the final result**, do not output text directly.
- Results must conform to the output format requirements. If you cannot answer some or all of the output items, tell the user honestly. Do not attempt to fabricate or deceive the user.
- Only call endSubAgent when the task is truly complete, continue using other tools before that
`;
  // Prepare messages
  const userMessage = `任务需求：${taskRequirement}\n\n输出格式要求：${outputFormat}`;
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(subAgentChatId, {
    tools: selectedTools as ToolSet,
  });

  // Add the task requirement as the first user message
  const messagesWithTask = [
    ...coreMessages,
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    subAgentChatId,
    5000,
    logger,
  );

  // Run streamText once - it will complete naturally when LLM finishes or max steps reached
  const streamTextPromise = new Promise<string>((resolve, reject) => {
    const response = streamText({
      model: llm("claude-3-7-sonnet"),
      providerOptions: defaultProviderOptions,
      system: systemPrompt,
      temperature: 0.5,
      messages: messagesWithTask,
      tools: selectedTools as ToolSet,
      toolChoice: "auto",
      experimental_repairToolCall: handleToolCallError,
      stopWhen: stepCountIs(MAX_STEPS),
      experimental_transform: smoothStream({
        delayInMs: 30,
        chunking: /[\u4E00-\u9FFF]|\S+\s+/,
      }),
      onChunk: async ({ chunk }: { chunk: TextStreamPart<ToolSet> }) => {
        appendChunkToStreamingMessage(streamingMessage, chunk);
        await debouncePersistentMessage(streamingMessage, {
          immediate:
            chunk.type !== "text-delta" &&
            chunk.type !== "reasoning-delta" &&
            chunk.type !== "tool-input-delta",
        });
      },
      onStepFinish: async (step) => {
        await immediatePersistentMessage();
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const { tokens, extra } = calculateStepTokensUsage(step);
        logger.info({
          msg: "runSubAgentStream streamText onStepFinish",
          toolCalls,
          usage: extra.usage,
          cache: extra.cache,
        });
        if (statReport) {
          const reportedBy = "createSubAgent tool";
          const promises = [
            statReport("steps", toolCalls.length, { reportedBy, subAgentChatId, toolCalls }),
            statReport("tokens", tokens, { reportedBy, subAgentChatId, ...extra }),
          ];
          await Promise.all(promises);
        }
      },
      onFinish: async ({ steps, text }) => {
        logger.info({
          msg: "runSubAgentStream streamText onFinish",
          textLength: text?.length,
          stepsCount: steps.length,
        });

        // Check if endSubAgent tool was called in any step
        let finalResult: string | null = null;
        for (const step of steps) {
          for (const toolCall of step.toolCalls) {
            if (toolCall.toolName === "endSubAgent") {
              // Extract result from tool call input
              const toolInput = toolCall.input as { result?: string };
              if (toolInput?.result) {
                finalResult = toolInput.result;
                logger.info(
                  { resultLength: finalResult.length },
                  "Found endSubAgent tool call with result",
                );
                break;
              }
            }
          }
          if (finalResult) break;
        }

        // If endSubAgent was not called, indicate no result
        if (!finalResult) {
          logger.warn("endSubAgent tool was not called, no result returned");
          finalResult =
            locale === "zh-CN"
              ? "任务执行完成，但任务太复杂了导致超时，未通过 endSubAgent 工具返回结果。"
              : "Task execution completed, but the task is too complex and timed out, no result was returned via endSubAgent tool.";
        }

        resolve(finalResult);
      },
      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`runSubAgentStream streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`runSubAgentStream streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },
      abortSignal,
    });

    abortSignal.addEventListener("abort", () => {
      reject(new Error("runSubAgentStream abortSignal received"));
    });

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  let finalResult: string;
  try {
    finalResult = await streamTextPromise;
  } catch (error) {
    throw error;
  }

  // Fallback if no text was captured
  if (!finalResult) {
    logger.warn("No final result found, using fallback message");
    finalResult =
      locale === "zh-CN"
        ? "任务已完成，但未能获取最终结果。"
        : "Task completed, but final result could not be retrieved.";
  }
  logger.debug({ finalResult }, "runSubAgentStream finalResult");
  return finalResult;
}

export const createSubAgentTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
  clients,
}: {
  userId: number;
  clients: MCPClient[];
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Create a sub-agent to complete ONE task using MCP tools. The tool will automatically select appropriate MCP tools and execute the task. The task should be focused, specific and clearly-described.",
    inputSchema: createSubAgentInputSchema,
    outputSchema: createSubAgentOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({
      subAgentChatToken,
      taskRequirement,
      outputFormat,
    }): Promise<CreateSubAgentResult> => {
      const title = taskRequirement.substring(0, 50);
      // Create a new UserChat for this sub-agent session
      const subAgentChat = await createUserChat({
        userId,
        title,
        kind: "misc", // Reuse scout kind for now
        token: subAgentChatToken,
      });
      const subAgentChatId = subAgentChat.id;
      const subAgentLog = logger.child({ subAgentChatId, subAgentChatToken });

      // Insert initial user message
      await persistentAIMessageToDB({
        userChatId: subAgentChatId,
        message: {
          id: generateId(),
          role: "user",
          parts: [
            {
              type: "text",
              text: `任务需求：${taskRequirement}\n\n输出格式要求：${outputFormat}`,
            },
          ],
        },
      });

      const { clearBackgroundToken } = await createBackgroundToken({
        toolUserChatId: subAgentChatId,
        toolLog: subAgentLog,
      });

      let result: string;
      try {
        // Step 1: Select MCP tools
        const selectedMcpNames = await selectMcpTools({
          taskRequirement,
          clients,
          locale,
          abortSignal,
          statReport,
          logger: subAgentLog,
        });

        subAgentLog.info(selectedMcpNames, "Selected MCP tools for sub-agent");
        if (selectedMcpNames.length === 0) {
          result = "There is no appropriate tool detected for this task.";
          return {
            result,
            plainText: result,
            subAgentChatId,
            subAgentChatToken,
          };
        }
        // Add a message to show tool selection phase
        const selectionMessage =
          locale === "zh-CN"
            ? `**工具选择完成**\n\n已选择以下 MCP 服务器来完成此任务：\n${selectedMcpNames.map((name, idx) => `${idx + 1}. ${name}`).join("\n")}\n\n开始执行任务...`
            : `**Tool Selection Complete**\n\nSelected the following MCP servers to complete this task:\n${selectedMcpNames.map((name, idx) => `${idx + 1}. ${name}`).join("\n")}\n\nStarting task execution...`;

        await persistentAIMessageToDB({
          userChatId: subAgentChatId,
          message: {
            id: generateId(),
            role: "assistant",
            parts: [{ type: "text", text: selectionMessage }],
          },
        });

        // Step 2: Run sub-agent with selected tools
        result = await runSubAgentStream({
          subAgentChatId,
          clients,
          taskRequirement,
          outputFormat,
          selectedMcpNames,
          locale,
          abortSignal,
          statReport,
          logger: subAgentLog,
        });
      } catch (error) {
        throw error;
      } finally {
        await clearBackgroundToken();
      }

      return {
        result,
        plainText: result,
        subAgentChatId,
        subAgentChatToken,
      };
    },
  });
