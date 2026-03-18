import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createStudyInputSchema,
  handleCreateStudy,
  sendMessageInputSchema,
  handleSendMessage,
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
        "Create a new study session from an initial user message. The session starts without a fixed study type, and the agent may first clarify the plan before continuing.",
      inputSchema: createStudyInputSchema,
    },
    handleCreateStudy,
  );

  server.registerTool(
    "atypica_study_send_message",
    {
      title: "Send Message to Study",
      description:
        "Send or continue a study turn. Supports both user and assistant roles, persists the message, starts or resumes study-agent execution asynchronously, and returns after the run is accepted. Poll atypica_study_get_messages for progress and pending interactions.",
      inputSchema: sendMessageInputSchema,
    },
    handleSendMessage,
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
      description:
        "Search personas by text query, optionally limiting to the caller's private personas. Without a query, returns the latest available personas visible to the caller.",
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
