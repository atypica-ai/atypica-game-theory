import "server-only";

import { getTeamConfig } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { rootLogger } from "@/lib/logging";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

/**
 * MCP Transport Configuration
 *
 * Stored in TeamConfig table with key "mcp" (TeamConfigName.mcp)
 * Expected JSON format in TeamConfig.value:
 * {
 *   "JupyterDataMCP": {
 *     "type": "http",
 *     "url": "https://example.com/mcp",
 *     "headers": { "Authorization": "Bearer token" },
 *     "prompt": "Optional description/prompt for this MCP server"
 *   }
 * }
 */
export type MCPTransportConfig = {
  type: "sse" | "http";
  /**
   * The URL of the MCP server.
   */
  url: string;
  /**
   * Additional HTTP headers to be sent with requests.
   */
  headers?: Record<string, string>;
  /**
   * Optional prompt/description for the MCP server
   */
  prompt?: string;
};

export type MCPConfigs = Record<string, MCPTransportConfig>;

/**
 * MCP tools type - tools returned from MCP client
 */
export type MCPTools = Awaited<ReturnType<Awaited<ReturnType<typeof createMCPClient>>["tools"]>>;

/**
 * MCP resource information
 */
export interface MCPResource {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

/**
 * MCP resource template information
 */
export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt information
 */
export interface MCPPrompt {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP prompt detail (full prompt with messages)
 */
export interface MCPPromptDetail {
  description?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: Array<{
      type: "text" | "image" | "resource";
      text?: string;
      data?: string;
      mimeType?: string;
      resource?: {
        uri: string;
        name?: string;
        title?: string;
        mimeType?: string;
        text?: string;
        blob?: string;
      };
    }>;
  }>;
}

/**
 * MCP metadata for tool selection and testing
 */
export interface MCPMetadata {
  name: string;
  prompt?: string; // Optional prompt/description for the MCP server (from config)
  tools: string[]; // List of tool names available from this MCP
  toolDescriptions: Record<string, string>; // Tool name -> description mapping
  resources: MCPResource[]; // List of available resources
  resourceTemplates: MCPResourceTemplate[]; // List of resource templates
  prompts: MCPPrompt[]; // List of available prompts
}

/**
 * MCPClient - Encapsulates a single MCP client with all its operations
 *
 * Features:
 * - Lazy loading and caching of tools, metadata, and prompt contents
 * - Automatic error handling with graceful fallbacks
 * - Structured data extraction for resources, templates, and prompts
 */
export class MCPClient {
  private readonly name: string;
  private readonly client: Awaited<ReturnType<typeof createMCPClient>>;
  private readonly config: MCPTransportConfig;
  private readonly logger: ReturnType<typeof rootLogger.child>;

  // Caches
  private _toolsCache: Promise<MCPTools> | null = null;
  private _metadataCache: Promise<MCPMetadata> | null = null;
  private _promptContentsCache: Promise<string> | null = null;

  constructor(
    name: string,
    client: Awaited<ReturnType<typeof createMCPClient>>,
    config: MCPTransportConfig,
  ) {
    this.name = name;
    this.client = client;
    this.config = config;
    this.logger = rootLogger.child({ mcpName: name });
  }

  /**
   * Get the name of this MCP client
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get tools from this MCP client (cached)
   */
  async getTools(): Promise<MCPTools> {
    if (!this._toolsCache) {
      this._toolsCache = this.client.tools();
    }
    return this._toolsCache;
  }

  /**
   * Get metadata for this MCP client (cached)
   * Includes tools, resources, templates, and prompts lists
   */
  async getMetadata(): Promise<MCPMetadata> {
    if (!this._metadataCache) {
      this._metadataCache = this._loadMetadata();
    }
    return this._metadataCache;
  }

  /**
   * Get concatenated prompt contents for all prompts from this MCP (cached)
   * Returns empty string if no prompts available
   */
  async getPromptContents(): Promise<string> {
    if (!this._promptContentsCache) {
      this._promptContentsCache = this._loadPromptContents();
    }
    return this._promptContentsCache;
  }

  /**
   * Load concatenated prompt contents for all prompts
   */
  private async _loadPromptContents(): Promise<string> {
    const metadata = await this.getMetadata();
    if (metadata.prompts.length === 0) {
      return "";
    }

    // Fetch all prompts in parallel
    const promptPromises = metadata.prompts.map((prompt) =>
      this.getPromptContentString(prompt.name),
    );
    const promptContents = await Promise.allSettled(promptPromises);

    // Filter and concatenate
    const validContents = promptContents
      .filter(
        (result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled",
      )
      .map((result) => result.value)
      .filter((content): content is string => content !== null);

    return validContents.join("\n\n---\n\n");
  }

  /**
   * Get detailed prompt information for a specific prompt
   */
  async getPromptDetail(promptName: string): Promise<MCPPromptDetail | null> {
    try {
      const promptResult = await this.client.getPrompt({ name: promptName });
      return {
        description: promptResult.description,
        messages: promptResult.messages.map((msg) => {
          // content can be a single object or an array - normalize it to an array
          const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];

          return {
            role: msg.role,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: contentArray.map((c: any) => {
              if (c.type === "text") {
                return { type: "text" as const, text: c.text };
              } else if (c.type === "image") {
                return { type: "image" as const, data: c.data, mimeType: c.mimeType };
              } else {
                return {
                  type: "resource" as const,
                  resource: {
                    uri: c.resource.uri,
                    name: c.resource.name,
                    title: c.resource.title,
                    mimeType: c.resource.mimeType,
                    text: "text" in c.resource ? c.resource.text : undefined,
                    blob: "blob" in c.resource ? c.resource.blob : undefined,
                  },
                };
              }
            }) as MCPPromptDetail["messages"][0]["content"],
          };
        }),
      };
    } catch (error) {
      this.logger.error(
        { promptName, error: (error as Error).message },
        "Failed to get prompt detail",
      );
      return null;
    }
  }

  /**
   * Get prompt content as a concatenated string for a specific prompt
   */
  private async getPromptContentString(promptName: string): Promise<string | null> {
    const promptDetail = await this.getPromptDetail(promptName);
    if (!promptDetail) {
      return null;
    }

    // Concatenate all messages into a single string
    const contentParts: string[] = [];

    if (promptDetail.description) {
      contentParts.push(promptDetail.description);
    }

    for (const message of promptDetail.messages) {
      const rolePrefix = message.role === "user" ? "User: " : "Assistant: ";
      for (const content of message.content) {
        if (content.type === "text" && content.text) {
          contentParts.push(`${rolePrefix}${content.text}`);
        } else if (content.type === "resource" && content.resource?.text) {
          contentParts.push(
            `${rolePrefix}[Resource: ${content.resource.uri}]\n${content.resource.text}`,
          );
        }
        // Skip image content as it's not useful in text format
      }
    }

    return contentParts.join("\n\n");
  }

  /**
   * Load metadata for this MCP client
   * Fetches tools, resources, templates, and prompts in parallel
   */
  private async _loadMetadata(): Promise<MCPMetadata> {
    const prompt = this.config.prompt;

    // Fetch all metadata in parallel for efficiency
    const [toolsResult, resourcesResult, templatesResult, promptsResult] = await Promise.allSettled(
      [
        this.client.tools(),
        this.client.listResources().catch(() => null), // Gracefully handle errors
        this.client.listResourceTemplates().catch(() => null),
        this.client.listPrompts().catch(() => null),
      ],
    );

    // Process tools
    const toolNames: string[] = [];
    const toolDescriptions: Record<string, string> = {};
    if (toolsResult.status === "fulfilled") {
      const mcpTools = toolsResult.value;
      Object.keys(mcpTools).forEach((toolName) => {
        toolNames.push(toolName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolDef = mcpTools[toolName] as any;
        toolDescriptions[toolName] = toolDef.description || toolDef.parameters?.description || "";
      });
    }

    // Process resources
    let resources: MCPResource[] = [];
    if (resourcesResult.status === "fulfilled" && resourcesResult.value) {
      resources = resourcesResult.value.resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        title: r.title,
        description: r.description,
        mimeType: r.mimeType,
        size: r.size,
      }));
    } else if (resourcesResult.status === "rejected") {
      this.logger.debug({ error: resourcesResult.reason }, "Failed to list resources");
    }

    // Process resource templates
    let resourceTemplates: MCPResourceTemplate[] = [];
    if (templatesResult.status === "fulfilled" && templatesResult.value) {
      resourceTemplates = templatesResult.value.resourceTemplates.map((t) => ({
        uriTemplate: t.uriTemplate,
        name: t.name,
        title: t.title,
        description: t.description,
        mimeType: t.mimeType,
      }));
    } else if (templatesResult.status === "rejected") {
      this.logger.debug({ error: templatesResult.reason }, "Failed to list resource templates");
    }

    // Process prompts
    let prompts: MCPPrompt[] = [];
    if (promptsResult.status === "fulfilled" && promptsResult.value) {
      prompts = promptsResult.value.prompts.map((p) => ({
        name: p.name,
        title: p.title,
        description: p.description,
        arguments: p.arguments?.map((arg) => ({
          name: arg.name,
          description: arg.description,
          required: arg.required,
        })),
      }));
    } else if (promptsResult.status === "rejected") {
      this.logger.debug({ error: promptsResult.reason }, "Failed to list prompts");
    }

    return {
      name: this.name,
      prompt,
      tools: toolNames,
      toolDescriptions,
      resources,
      resourceTemplates,
      prompts,
    };
  }
}

/**
 * MCPClientManager - Manages MCP clients with lazy loading
 *
 * Features:
 * - Lazy loads team MCP configurations on first access
 * - Caches clients per team in memory
 * - Handles concurrent requests with loadingPromises to avoid duplicate loads
 * - Cache automatically invalidated when team config changes (via revalidateTag on getTeamConfig)
 * - Singleton pattern
 *
 * Usage:
 * - Call getClientsForTeam(teamId) to get all clients for a team
 * - Call reloadTeamClients(teamId) to force reload after config changes
 */
export class MCPClientManager {
  // Cache team-specific clients (lazy loaded on demand)
  private teamClientsCache: Map<number, MCPClient[]> = new Map();
  // Track loading promises to avoid duplicate loads
  private loadingPromises: Map<number, Promise<void>> = new Map();

  /**
   * Get all MCP clients for a team
   * Lazy loads on first access, returns cached clients on subsequent calls
   */
  async getClientsForTeam(teamId: number): Promise<MCPClient[]> {
    // Return cached if already loaded
    if (this.teamClientsCache.has(teamId)) {
      return this.teamClientsCache.get(teamId)!;
    }

    // If currently loading, wait for that promise
    if (this.loadingPromises.has(teamId)) {
      await this.loadingPromises.get(teamId);
      return this.teamClientsCache.get(teamId) ?? [];
    }

    // Start loading
    const loadPromise = this._loadTeamClients(teamId);
    this.loadingPromises.set(teamId, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(teamId);
    }

    return this.teamClientsCache.get(teamId) ?? [];
  }

  /**
   * Get a specific MCP client by name from a team's clients
   * Triggers lazy load if not yet loaded
   */
  async getClientForTeam(teamId: number, name: string): Promise<MCPClient | undefined> {
    const teamClients = await this.getClientsForTeam(teamId);
    return teamClients.find((client) => client.getName() === name);
  }

  /**
   * Get all metadata from all MCP clients for a team (aggregated)
   * Triggers lazy load if not yet loaded
   */
  async getAllMetadataForTeam(teamId: number): Promise<MCPMetadata[]> {
    const teamClients = await this.getClientsForTeam(teamId);
    const metadataPromises = teamClients.map((client) => client.getMetadata());
    const metadataResults = await Promise.allSettled(metadataPromises);

    const metadata: MCPMetadata[] = [];
    for (let i = 0; i < metadataResults.length; i++) {
      const result = metadataResults[i];
      if (result.status === "fulfilled") {
        metadata.push(result.value);
      } else {
        const client = teamClients[i];
        rootLogger.error(
          { mcpName: client.getName(), error: result.reason },
          "Failed to load MCP metadata",
        );
      }
    }

    return metadata;
  }

  /**
   * Reload MCP clients for a specific team
   * Clears cache and reloads from database
   * Should be called when team's MCP config is created, updated, or deleted
   */
  async reloadTeamClients(teamId: number): Promise<void> {
    // Clear cache
    this.teamClientsCache.delete(teamId);
    this.loadingPromises.delete(teamId);

    // Reload
    await this._loadTeamClients(teamId);

    rootLogger.info(
      {
        teamId,
        mcpCount: this.teamClientsCache.get(teamId)?.length ?? 0,
        mcpNames: this.teamClientsCache.get(teamId)?.map((c) => c.getName()) ?? [],
      },
      "Reloaded MCP clients for team",
    );
  }

  /**
   * Load MCP clients for a specific team
   * Uses getTeamConfig to fetch config with caching
   */
  private async _loadTeamClients(teamId: number): Promise<void> {
    try {
      // Get team's MCP config using cached helper function
      const mcpConfig = await getTeamConfig<MCPConfigs>(teamId, TeamConfigName.mcp);

      if (!mcpConfig || Object.keys(mcpConfig).length === 0) {
        rootLogger.debug({ teamId }, "No MCP config found for team");
        this.teamClientsCache.set(teamId, []);
        return;
      }

      // Load clients for the config
      const clientsMap = await this._loadAllClients(mcpConfig);
      const clients = Array.from(clientsMap.values());
      this.teamClientsCache.set(teamId, clients);

      rootLogger.info(
        {
          teamId,
          mcpCount: clients.length,
          mcpNames: clients.map((c) => c.getName()),
        },
        "Loaded MCP clients for team",
      );
    } catch (error) {
      rootLogger.error(
        { teamId, error: (error as Error).message },
        "Failed to load MCP clients for team",
      );
      // Set empty array on error
      this.teamClientsCache.set(teamId, []);
    }
  }

  /**
   * Load all MCP clients from configuration
   */
  private async _loadAllClients(configs: MCPConfigs): Promise<Map<string, MCPClient>> {
    const configEntries = Object.entries(configs);

    if (configEntries.length === 0) {
      rootLogger.info("No MCP configurations found, skipping MCP clients initialization");
      return new Map();
    }

    rootLogger.info(
      { mcpCount: configEntries.length, mcpNames: configEntries.map(([name]) => name) },
      "Starting MCP clients initialization",
    );

    // Load all clients in parallel
    const results = await Promise.allSettled(
      configEntries.map(([name, config]) => this._loadClient(name, config)),
    );

    const clients = new Map<string, MCPClient>();
    let successCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const [name] = configEntries[i];

      if (result.status === "fulfilled" && result.value !== null) {
        clients.set(name, result.value);
        successCount++;
      } else if (result.status === "rejected") {
        rootLogger.error(
          { error: result.reason, mcpName: name },
          `MCP client ${name} failed to load`,
        );
      }
    }

    rootLogger.info(
      {
        successful: successCount,
        failed: configEntries.length - successCount,
        totalClients: clients.size,
      },
      `MCP clients loaded: ${successCount}/${configEntries.length} clients`,
    );

    return clients;
  }

  /**
   * Load a single MCP client
   */
  private async _loadClient(name: string, config: MCPTransportConfig): Promise<MCPClient | null> {
    const logger = rootLogger.child({ mcpName: name });
    try {
      logger.info({ url: config.url, type: config.type }, "Initializing MCP client");

      const client = await createMCPClient({
        transport: {
          type: config.type,
          url: config.url,
          ...(config.headers && { headers: config.headers }),
        },
      });

      // Test connection by getting tools
      const tools = await client.tools();
      const toolCount = Object.keys(tools).length;

      logger.info(
        { toolCount, toolNames: Object.keys(tools) },
        `MCP client initialized successfully with ${toolCount} tools`,
      );

      return new MCPClient(name, client, config);
    } catch (error) {
      logger.error(
        { error: (error as Error).message, url: config.url },
        `Failed to initialize MCP client: ${name}`,
      );
      return null;
    }
  }
}

// Singleton manager instance
const manager = new MCPClientManager();

/**
 * Get all MCP clients with metadata for tool selection and testing for a team
 * Returns metadata about each MCP server including name, tools, resources, and prompts
 * Results are cached per team, loaded lazily on first access
 */
export async function getAllMcpMetadataForTeam(teamId: number): Promise<MCPMetadata[]> {
  return manager.getAllMetadataForTeam(teamId);
}

/**
 * Get the MCP client manager instance
 * Allows direct access to clients for more advanced use cases
 * @example
 * const manager = getMcpClientManager();
 * const clients = await manager.getClientsForTeam(teamId);
 * const client = manager.getClientForTeam(teamId, "JupyterDataMCP");
 */
export function getMcpClientManager(): MCPClientManager {
  return manager;
}

/**
 * Reload MCP clients for a specific team
 * Should be called when team's MCP config is created, updated, or deleted
 */
export async function reloadTeamMcpClients(teamId: number): Promise<void> {
  return manager.reloadTeamClients(teamId);
}
