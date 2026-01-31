import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createStudyInputSchema,
  handleCreateStudy,
  sendMessageInputSchema,
  handleSendMessage,
  getStatusInputSchema,
  handleGetStatus,
  listStudiesInputSchema,
  handleListStudies,
  getMessagesInputSchema,
  handleGetMessages,
  getReportInputSchema,
  handleGetReport,
  getPodcastInputSchema,
  handleGetPodcast,
  searchPersonasInputSchema,
  handleSearchPersonas,
  getPersonaInputSchema,
  handleGetPersona,
} from "./tools";

/**
 * Create and configure the Study MCP Server
 */
export function createStudyMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "atypica-study-mcp",
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

  // Register tools
  server.registerTool(
    "atypica_study_create",
    {
      title: "Create Study Session",
      description:
        "Create a new study/research session. Omit 'kind' to enter Plan Mode where AI will decide the research type.",
      inputSchema: createStudyInputSchema,
    },
    handleCreateStudy,
  );

  server.registerTool(
    "atypica_study_send_message",
    {
      title: "Send Message to Study",
      description: "Send a user message to an existing study session. Supports both user and assistant roles. For addToolResult pattern, provide message.id to update existing message.",
      inputSchema: sendMessageInputSchema,
    },
    handleSendMessage,
  );

  server.registerTool(
    "atypica_study_get_status",
    {
      title: "Get Study Status",
      description: "Get current status and progress of a study session",
      inputSchema: getStatusInputSchema,
    },
    handleGetStatus,
  );

  server.registerTool(
    "atypica_study_list",
    {
      title: "List Study Sessions",
      description: "List user's study sessions with pagination",
      inputSchema: listStudiesInputSchema,
    },
    handleListStudies,
  );

  server.registerTool(
    "atypica_study_get_messages",
    {
      title: "Get Study Messages",
      description: "Get conversation history from a study session",
      inputSchema: getMessagesInputSchema,
    },
    handleGetMessages,
  );

  server.registerTool(
    "atypica_study_get_report",
    {
      title: "Get Study Report",
      description: "Get the generated research report content",
      inputSchema: getReportInputSchema,
    },
    handleGetReport,
  );

  server.registerTool(
    "atypica_study_get_podcast",
    {
      title: "Get Study Podcast",
      description: "Get the generated podcast content and audio URL",
      inputSchema: getPodcastInputSchema,
    },
    handleGetPodcast,
  );

  server.registerTool(
    "atypica_persona_search",
    {
      title: "Search AI Personas",
      description: "Search for AI personas by query or filter by tier",
      inputSchema: searchPersonasInputSchema,
    },
    handleSearchPersonas,
  );

  server.registerTool(
    "atypica_persona_get",
    {
      title: "Get Persona Details",
      description: "Get detailed information about a specific AI persona",
      inputSchema: getPersonaInputSchema,
    },
    handleGetPersona,
  );

  return server;
}

// Export singleton instance
let serverInstance: McpServer | null = null;

export function getStudyMcpServer(): McpServer {
  if (!serverInstance) {
    serverInstance = createStudyMcpServer();
  }
  return serverInstance;
}
