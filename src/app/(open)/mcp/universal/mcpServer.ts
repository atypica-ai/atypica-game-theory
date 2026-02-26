import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createChatInputSchema,
  handleCreateChat,
  sendMessageInputSchema,
  handleSendMessage,
  listChatsInputSchema,
  handleListChats,
  getMessagesInputSchema,
  handleGetMessages,
} from "./tools";

/**
 * Create and configure the Universal Agent MCP Server
 */
export function createUniversalMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "atypica-universal-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    },
  );

  server.registerTool(
    "atypica_universal_create",
    {
      title: "Create Universal Chat",
      description:
        "Create a new universal chat session. The universal agent can run discussions, interviews, bash tools, skills, and generate reports.",
      inputSchema: createChatInputSchema,
    },
    handleCreateChat,
  );

  server.registerTool(
    "atypica_universal_send_message",
    {
      title: "Send Message to Universal Chat",
      description:
        "Send a user message to an existing universal or study chat. Runs the universal agent (blocking). For addToolResult pattern, provide message.id to update existing message.",
      inputSchema: sendMessageInputSchema,
    },
    handleSendMessage,
  );

  server.registerTool(
    "atypica_universal_list",
    {
      title: "List Universal Chats",
      description: "List user's universal chat sessions with pagination",
      inputSchema: listChatsInputSchema,
    },
    handleListChats,
  );

  server.registerTool(
    "atypica_universal_get_messages",
    {
      title: "Get Universal Chat Messages",
      description:
        "Get conversation history from a universal or study chat. Returns isRunning when the agent is still executing.",
      inputSchema: getMessagesInputSchema,
    },
    handleGetMessages,
  );

  return server;
}

let serverInstance: McpServer | null = null;

export function getUniversalMcpServer(): McpServer {
  if (!serverInstance) {
    serverInstance = createUniversalMcpServer();
  }
  return serverInstance;
}
