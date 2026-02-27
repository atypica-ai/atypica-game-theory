import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getMessagesInputSchema,
  getPersonaInputSchema,
  getPodcastInputSchema,
  getReportInputSchema,
  handleGetMessages,
  handleGetPersona,
  handleGetPodcast,
  handleGetReport,
  handleSearchPersonas,
  searchPersonasInputSchema,
} from "../shared/tools";
import {
  createChatInputSchema,
  handleCreateChat,
  handleListChats,
  handleSendMessage,
  listChatsInputSchema,
  sendMessageInputSchema,
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

  server.registerTool(
    "atypica_universal_get_report",
    {
      title: "Get Report",
      description: "Retrieve a generated research report by token",
      inputSchema: getReportInputSchema,
    },
    handleGetReport,
  );

  server.registerTool(
    "atypica_universal_get_podcast",
    {
      title: "Get Podcast",
      description: "Retrieve a generated podcast by token",
      inputSchema: getPodcastInputSchema,
    },
    handleGetPodcast,
  );

  server.registerTool(
    "atypica_universal_search_personas",
    {
      title: "Search Personas",
      description: "Search for personas by query, tier, or list all available personas",
      inputSchema: searchPersonasInputSchema,
    },
    handleSearchPersonas,
  );

  server.registerTool(
    "atypica_universal_get_persona",
    {
      title: "Get Persona Details",
      description: "Retrieve full details of a specific persona by ID",
      inputSchema: getPersonaInputSchema,
    },
    handleGetPersona,
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
