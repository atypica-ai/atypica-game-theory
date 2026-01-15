# MCP 集成能力

**一句话总结**：团队级 MCP (Model Context Protocol) 集成，让 AI Agent 自动连接外部工具和数据源（Jupyter、数据库、文件系统等），无需编写代码。

---

## 核心对比：有 MCP vs 无 MCP

| 维度 | 有 MCP 集成 | 无 MCP（传统方式） |
|------|-----------|-----------------|
| **工具扩展** | 动态加载外部工具（零代码） | 需编写集成代码 |
| **配置方式** | 团队级 JSON 配置 | 开发部署 |
| **可用工具** | 无限（任何 MCP 服务器） | 预定义工具集 |
| **更新速度** | 即时（更新配置即生效） | 需重新部署 |
| **团队定制** | ✅ 每个团队独立配置 | ❌ 全局统一 |
| **数据访问** | ✅ 团队私有数据源（Jupyter、数据库） | ❌ 无法访问私有数据 |
| **工具选择** | ✅ AI 自动选择合适的 MCP 工具 | N/A |
| **使用门槛** | 团队管理员配置 | 需开发人员 |
| **典型用例** | Jupyter 笔记本分析、数据库查询、文件系统操作 | 预置的 web 搜索、推理工具 |

---

## 核心概念

### 1. 什么是 MCP？

**MCP (Model Context Protocol)** 是 Anthropic 推出的开放协议，用于连接 LLM 应用与外部工具/数据源。

**类比**：
- **MCP** = 插件系统（类似 VS Code Extensions, Chrome Extensions）
- **MCP Server** = 单个插件（提供特定功能）
- **MCP Client** = 插件管理器（加载和调用插件）

**官方网站**：https://modelcontextprotocol.org

### 2. MCP 在 atypica.AI 中的定位

```
┌────────────────────────────────────────────────┐
│                 atypica.AI                     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  AI Agent (Study / Fast Insight / etc.)  │ │
│  │                                          │ │
│  │  内置工具:                                │ │
│  │  - webSearch, reasoningThinking          │ │
│  │  - interviewChat, buildPersona           │ │
│  │  - generateReport, generatePodcast       │ │
│  └──────────────┬───────────────────────────┘ │
│                 │                              │
│                 │ + MCP 集成（可选）            │
│                 ▼                              │
│  ┌──────────────────────────────────────────┐ │
│  │   MCP Client Manager (团队级)            │ │
│  │                                          │ │
│  │   ┌────────────┐  ┌────────────┐       │ │
│  │   │  Jupyter   │  │  Database  │       │ │
│  │   │  MCP       │  │  MCP       │  ...  │ │
│  │   └────────────┘  └────────────┘       │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**关键点**：
- MCP 是**可选**的增强功能，非必需
- 配置在**团队级别**，团队成员共享
- Agent 自动检测可用 MCP 并智能选择使用

### 3. 支持的 MCP Transport 类型

```typescript
// src/ai/tools/mcp/client.ts:22-36
export type MCPTransportConfig = {
  type: "sse" | "http";  // 传输协议类型
  url: string;            // MCP 服务器地址
  headers?: Record<string, string>;  // HTTP 请求头（如 Authorization）
  prompt?: string;        // 可选的服务器描述（帮助 AI 理解用途）
};
```

**Transport 类型**：
- **SSE (Server-Sent Events)**：实时流式通信，适合长时间运行的任务
- **HTTP**：标准 HTTP 请求-响应，适合简单的工具调用

---

## 团队级配置

### 1. TeamConfig 数据结构

```typescript
// prisma/schema.prisma:41-52
model TeamConfig {
  id     Int    @id @default(autoincrement())
  teamId Int
  team   Team   @relation("TeamConfig", ...)
  key    String @db.VarChar(255)  // TeamConfigName.mcp = "mcp"
  value  Json   @default("{}")    // MCPConfigs

  createdAt DateTime
  updatedAt DateTime

  @@unique([teamId, key])  // 每个团队每个 key 只有一条记录
}
```

**支持的 TeamConfig 类型**：
```typescript
// src/app/team/teamConfig/types.ts:4-8
export enum TeamConfigName {
  mcp = "mcp",                        // MCP 服务器配置
  studySystemPrompt = "studySystemPrompt",  // 团队自定义 System Prompt
  emailDomainWhitelist = "emailDomainWhitelist",  // 邮箱域名白名单
}
```

### 2. MCP Config JSON 格式

```typescript
// src/ai/tools/mcp/client.ts:11-20
// Expected JSON format in TeamConfig.value:
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://example.com/mcp",
    "headers": { "Authorization": "Bearer token" },
    "prompt": "Jupyter notebook analysis server for data science tasks"
  },
  "CompanyDatabaseMCP": {
    "type": "sse",
    "url": "https://db-mcp.company.com",
    "headers": { "X-API-Key": "secret-key" },
    "prompt": "Internal company database with customer data and analytics"
  }
}
```

**关键字段**：
- **Key**（如 "JupyterDataMCP"）：MCP 服务器的唯一标识符
- **type**：传输协议（`sse` | `http`）
- **url**：MCP 服务器地址
- **headers**：认证和自定义请求头
- **prompt**：可选的服务器描述，帮助 AI 理解何时使用该 MCP

### 3. 配置示例

**场景 1：数据科学团队**

```json
{
  "JupyterHub": {
    "type": "http",
    "url": "https://jupyter.company.com/mcp",
    "headers": {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "prompt": "JupyterHub MCP for running Python data analysis. Use this for data processing, statistical analysis, and visualization tasks."
  },
  "PostgreSQL": {
    "type": "http",
    "url": "https://db-mcp.company.com/postgres",
    "headers": {
      "X-Database": "analytics",
      "X-API-Key": "secret-key"
    },
    "prompt": "PostgreSQL database MCP with company analytics data. Use this for querying sales, customer, and marketing data."
  }
}
```

**场景 2：开发团队**

```json
{
  "GitHub": {
    "type": "http",
    "url": "https://mcp-github.company.com",
    "headers": {
      "Authorization": "token ghp_xxxxxxxxxxxx"
    },
    "prompt": "GitHub MCP for accessing company repositories. Use this for code search, issue tracking, and pull request management."
  },
  "FileSystem": {
    "type": "http",
    "url": "https://fs-mcp.company.com",
    "prompt": "Secure file system MCP for accessing team shared documents and configuration files."
  }
}
```

---

## MCPClientManager 架构

### 1. 核心类设计

```typescript
// src/ai/tools/mcp/client.ts:119-380
/**
 * MCPClient - 封装单个 MCP 客户端
 *
 * 功能：
 * - 延迟加载和缓存 tools、metadata、prompt contents
 * - 自动错误处理和降级
 * - 结构化数据提取（resources, templates, prompts）
 */
export class MCPClient {
  private readonly name: string;
  private readonly client: Awaited<ReturnType<typeof createMCPClient>>;
  private readonly config: MCPTransportConfig;

  // 缓存
  private _toolsCache: Promise<MCPTools> | null = null;
  private _metadataCache: Promise<MCPMetadata> | null = null;
  private _promptContentsCache: Promise<string> | null = null;

  async getTools(): Promise<MCPTools> { ... }
  async getMetadata(): Promise<MCPMetadata> { ... }
  async getPromptContents(): Promise<string> { ... }
}
```

```typescript
// src/ai/tools/mcp/client.ts:382-612
/**
 * MCPClientManager - 管理所有团队的 MCP 客户端
 *
 * 功能：
 * - 延迟加载：首次访问时才加载配置
 * - 缓存：每个团队的 clients 在内存中缓存
 * - 并发安全：使用 loadingPromises 避免重复加载
 * - 自动失效：当 TeamConfig 变更时，缓存通过 revalidateTag 自动失效
 * - 单例模式
 */
export class MCPClientManager {
  private teamClientsCache: Map<number, MCPClient[]> = new Map();
  private loadingPromises: Map<number, Promise<void>> = new Map();

  async getClientsForTeam(teamId: number): Promise<MCPClient[]> { ... }
  async getClientForTeam(teamId: number, name: string): Promise<MCPClient | undefined> { ... }
  async getAllMetadataForTeam(teamId: number): Promise<MCPMetadata[]> { ... }
  async reloadTeamClients(teamId: number): Promise<void> { ... }
}
```

**设计亮点**：
1. **延迟加载**：首次访问才加载配置和连接 MCP 服务器
2. **多层缓存**：
   - Team-level: `teamClientsCache` 缓存每个团队的 clients
   - Client-level: `_toolsCache`, `_metadataCache` 缓存每个 MCP 的数据
3. **并发安全**：使用 `loadingPromises` 防止同时加载同一团队的配置
4. **单例模式**：全局唯一 manager 实例

### 2. Metadata 结构

```typescript
// src/ai/tools/mcp/client.ts:108-117
export interface MCPMetadata {
  name: string;                              // MCP 服务器名称
  prompt?: string;                           // 服务器描述（来自配置）
  tools: string[];                           // 可用工具名称列表
  toolDescriptions: Record<string, string>;  // 工具名称 → 描述映射
  resources: MCPResource[];                  // 可用资源列表
  resourceTemplates: MCPResourceTemplate[];  // 资源模板列表
  prompts: MCPPrompt[];                      // 可用 prompts 列表
}
```

**MCP 提供的能力**：
- **Tools**：可调用的函数（如 `run_python_code`, `query_database`）
- **Resources**：可读取的资源（如文件、数据库表）
- **Prompts**：预定义的提示词模板

---

## Agent 自动集成 MCP

### Phase 1: 加载 MCP Clients

```typescript
// src/app/(study)/agents/baseAgentRequest.ts:191-201
// Phase 4: Universal MCP and Team System Prompt

// Load MCP clients (universal, if team-specific)
const manager = getMcpClientManager();
const mcpClients = baseContext.teamId
  ? await manager.getClientsForTeam(baseContext.teamId)
  : [];

logger.info({
  msg: "Loaded MCP clients",
  mcpClients: mcpClients.length,
  teamId: baseContext.teamId,
});
```

**关键点**：
- 仅在团队用户时加载（`baseContext.teamId` 存在）
- 个人用户无 MCP 功能
- 使用 MCPClientManager 的缓存机制，首次加载后缓存在内存

### Phase 2: 添加 createSubAgent Tool

```typescript
// src/app/(study)/agents/baseAgentRequest.ts:220-235
// Build final tools (add createSubAgent if MCP clients available)
const finalTools = { ...config.tools };

if (mcpClients.length > 0) {
  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger,
  };

  finalTools[StudyToolName.createSubAgent] = createSubAgentTool({
    mcpClients,
    userId,
    ...agentToolArgs,
  });
}
```

**核心逻辑**：
- **条件注入**：仅当 `mcpClients.length > 0` 时才添加 `createSubAgent` tool
- **透明集成**：Agent 无需修改代码，自动获得 MCP 能力
- **工具名称**：`StudyToolName.createSubAgent = "createSubAgent"`

---

## createSubAgent Tool 详解

### 1. Tool Definition

```typescript
// src/app/(study)/tools/createSubAgent/index.ts
export const createSubAgentTool = ({
  mcpClients,
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  mcpClients: MCPClient[];
  userId: number;
} & AgentToolConfigArgs) =>
  tool({
    description: `Create a sub-agent with selected MCP tools to complete a specific task. The sub-agent will have access to specialized tools from MCP servers for advanced operations.`,

    inputSchema: z.object({
      taskRequirement: z.string().describe(
        "Clear description of the task to be completed by the sub-agent, including required inputs and expected output format"
      ),
    }),

    outputSchema: createSubAgentOutputSchema,

    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },

    execute: async ({ taskRequirement }) => {
      // Step 1: 选择 MCP 工具
      // Step 2: 创建 sub-agent 并执行
      // Step 3: 返回结果
    },
  });
```

### 2. 执行流程（Two-Step）

#### Step 1: 智能选择 MCP 工具

```typescript
// src/app/(study)/tools/createSubAgent/index.ts:94-171
async function selectMcpTools({
  taskRequirement,
  clients,
  locale,
  logger,
  abortSignal,
  statReport,
}: ...): Promise<string[]> {
  // 1. 获取所有 MCP 的 metadata
  const metadataPromises = clients.map((client) => client.getMetadata());
  const metadataResults = await Promise.allSettled(metadataPromises);

  // 2. 构建 MCP 信息文本
  const mcpInfoText = metadataResults.map((result, index) => {
    const mcp = result.value;
    const toolsInfo = mcp.tools
      .map((toolName) =>
        `  - **${toolName}**: ${mcp.toolDescriptions[toolName] || "No description"}`
      )
      .join("\n");
    return `## ${index + 1}. ${mcp.name}\n\n**Available Tools**:\n${toolsInfo}`;
  }).join("\n\n---\n\n");

  // 3. 使用 Gemini 2.5 Flash 选择合适的 MCP
  const result = await generateObject({
    model: llm("gemini-2.5-flash"),
    schema: z.object({
      selectedMcpNames: z.array(z.string()).describe(
        "List of MCP server names that should be used for this task"
      ),
    }),
    system: `You are a tool selection expert...`,
    prompt: `
      <Task Requirement>
      ${taskRequirement}
      </Task Requirement>

      <Available MCP Servers>
      ${mcpInfoText}
      </Available MCP Servers>

      Select the MCP servers needed to complete this task.
    `,
    maxRetries: 3,
    abortSignal,
  });

  return result.object.selectedMcpNames;
}
```

**关键设计**：
- **模型选择**：使用 `gemini-2.5-flash`（快速、成本低）
- **输入**：任务需求 + 所有 MCP 的工具列表和描述
- **输出**：应该使用的 MCP 服务器名称列表
- **智能判断**：AI 根据任务需求自动选择最合适的 MCP

**示例**：

任务需求：
```
Analyze the sales data from Q4 2025 and create a visualization of monthly revenue trends
```

可用 MCP：
```
1. JupyterHub
   - run_python_code: Execute Python code in Jupyter
   - create_notebook: Create new Jupyter notebook

2. PostgreSQL
   - query_database: Execute SQL query
   - list_tables: List all database tables

3. FileSystem
   - read_file: Read file contents
   - write_file: Write content to file
```

AI 选择：
```json
{
  "selectedMcpNames": ["PostgreSQL", "JupyterHub"]
}
```

#### Step 2: 创建并执行 Sub-Agent

```typescript
// 简化的伪代码
async function executeSub-Agent({
  taskRequirement,
  selectedMcpTools,
  ...
}) {
  // 1. 从选中的 MCP 获取 tools
  const allMcpTools = {};
  for (const mcpName of selectedMcpNames) {
    const client = clients.find((c) => c.getName() === mcpName);
    const tools = await client.getTools();
    Object.assign(allMcpTools, tools);
  }

  // 2. 添加 endSubAgent tool（让 sub-agent 能输出最终结果）
  const endSubAgentTool = tool({
    description: "Call this tool when the task is complete to output the final result",
    parameters: z.object({
      result: z.string().describe("The final result"),
    }),
    execute: async ({ result }) => ({ result }),
  });

  // 3. 创建 sub-agent 对话
  const userChat = await createUserChat({
    userId,
    kind: "misc",
    title: `Sub-agent: ${taskRequirement.substring(0, 50)}...`,
  });

  // 4. 执行 streamText，最多 20 步
  const result = await streamText({
    model: llm("claude-sonnet-4-5"),
    system: `You are a specialized sub-agent... Your task: ${taskRequirement}`,
    messages: [{ role: "user", content: taskRequirement }],
    tools: {
      ...allMcpTools,       // MCP 提供的工具
      endSubAgent: endSubAgentTool,  // 结束工具
    },
    stopWhen: stepCountIs(MAX_STEPS),  // 最多 20 步
    maxRetries: 3,
  });

  // 5. 从 endSubAgent tool 提取最终结果
  const endToolResult = result.steps
    .flatMap((step) => step.toolResults)
    .find((tool) => tool.toolName === "endSubAgent");

  return endToolResult?.output.result || result.text;
}
```

**核心机制**：
- **独立对话**：创建新的 `UserChat`（kind: "misc"）
- **工具组合**：MCP tools + `endSubAgent` tool
- **步数限制**：最多 20 步（防止死循环）
- **结果提取**：从 `endSubAgent` tool 获取最终输出

### 3. 完整示例

**用户请求**（在 Study Agent 中）：
```
帮我分析一下 2025 年 Q4 的销售数据，看看哪个地区表现最好，并生成一个可视化图表。
```

**Study Agent 自动调用 createSubAgent tool**：
```json
{
  "taskRequirement": "Query sales data for Q4 2025 from the database, analyze which region had the best performance, and create a bar chart visualization showing revenue by region. Output should include the chart as an image and a brief summary of findings."
}
```

**Step 1: 选择 MCP**（gemini-2.5-flash）：
```json
{
  "selectedMcpNames": ["PostgreSQL", "JupyterHub"]
}
```

**Step 2: Sub-Agent 执行**（claude-sonnet-4-5）：

1. **Tool Call: PostgreSQL.query_database**
   ```sql
   SELECT region, SUM(revenue) as total_revenue
   FROM sales
   WHERE date >= '2025-10-01' AND date < '2026-01-01'
   GROUP BY region
   ORDER BY total_revenue DESC
   ```

   结果：
   ```
   | region | total_revenue |
   |--------|---------------|
   | APAC   | 15,234,567    |
   | EMEA   | 12,876,543    |
   | Americas | 10,987,654  |
   ```

2. **Tool Call: JupyterHub.run_python_code**
   ```python
   import matplotlib.pyplot as plt

   regions = ['APAC', 'EMEA', 'Americas']
   revenues = [15234567, 12876543, 10987654]

   plt.figure(figsize=(10, 6))
   plt.bar(regions, revenues)
   plt.title('Q4 2025 Revenue by Region')
   plt.ylabel('Revenue (USD)')
   plt.savefig('q4_revenue.png')
   plt.close()

   # Return image path
   'q4_revenue.png'
   ```

   结果：`Image saved at q4_revenue.png`

3. **Tool Call: endSubAgent**
   ```json
   {
     "result": "Analysis Complete:\n\n**Best Performing Region**: APAC with $15.2M in revenue\n\n**Key Findings**:\n- APAC: $15.2M (39%)\n- EMEA: $12.9M (33%)\n- Americas: $11.0M (28%)\n\nAPAC outperformed other regions by 18% (vs EMEA) and 39% (vs Americas). See attached visualization for details.\n\n[Chart: q4_revenue.png]"
   }
   ```

**返回给 Study Agent**：
```
Sub-agent completed the analysis successfully.

Results:
Analysis Complete:

**Best Performing Region**: APAC with $15.2M in revenue

**Key Findings**:
- APAC: $15.2M (39%)
- EMEA: $12.9M (33%)
- Americas: $11.0M (28%)

APAC outperformed other regions by 18% (vs EMEA) and 39% (vs Americas). See attached visualization for details.

[Chart: q4_revenue.png]
```

---

## 实际应用场景

### 场景 1：数据分析团队

**需求**：
- 访问公司 PostgreSQL 数据库
- 使用 Jupyter 进行数据分析和可视化
- 将结果保存到团队共享文件夹

**MCP 配置**：
```json
{
  "CompanyDB": {
    "type": "http",
    "url": "https://db-mcp.company.com",
    "headers": { "X-API-Key": "secret-key" },
    "prompt": "PostgreSQL database with sales, customer, and marketing data"
  },
  "JupyterHub": {
    "type": "http",
    "url": "https://jupyter.company.com/mcp",
    "headers": { "Authorization": "Bearer token" },
    "prompt": "JupyterHub for Python data analysis and visualization"
  },
  "TeamDrive": {
    "type": "http",
    "url": "https://drive-mcp.company.com",
    "prompt": "Team shared file storage"
  }
}
```

**使用示例**：
```
用户: 帮我分析一下上个月新增客户的地域分布，生成报告并保存到团队文件夹

Study Agent:
1. 调用 createSubAgent
2. Sub-agent 自动选择 CompanyDB + JupyterHub + TeamDrive
3. 查询数据库 → 分析处理 → 生成可视化 → 保存文件
4. 返回完整报告
```

### 场景 2：开发团队

**需求**：
- 访问 GitHub 仓库
- 读取项目配置文件
- 运行代码质量检查

**MCP 配置**：
```json
{
  "GitHub": {
    "type": "http",
    "url": "https://github-mcp.company.com",
    "headers": { "Authorization": "token ghp_xxx" },
    "prompt": "GitHub repository access for code search and PR management"
  },
  "ProjectFiles": {
    "type": "http",
    "url": "https://fs-mcp.company.com/project",
    "prompt": "Project configuration files and documentation"
  }
}
```

**使用示例**：
```
用户: 检查最近 10 个 PR 的代码质量，看看有没有常见的问题

Study Agent:
1. 调用 createSubAgent
2. Sub-agent 自动选择 GitHub + ProjectFiles
3. 获取 PR 列表 → 读取代码 → 分析问题模式
4. 返回质量报告和建议
```

### 场景 3：市场调研团队

**需求**：
- 访问内部市场数据库
- 使用 Web 搜索获取外部信息
- 生成综合报告

**MCP 配置**：
```json
{
  "MarketDB": {
    "type": "http",
    "url": "https://market-mcp.company.com",
    "headers": { "X-API-Key": "secret-key" },
    "prompt": "Internal market research database with competitor data and industry reports"
  }
}
```

**使用示例**：
```
用户: 对比我们公司和竞争对手 A、B 在 Q4 的市场表现

Study Agent:
1. 调用 createSubAgent（结合内置 webSearch 和 MarketDB MCP）
2. Sub-agent:
   - 查询内部数据库（我们的数据）
   - Web 搜索（竞争对手公开数据）
   - 综合分析对比
3. 返回完整对比报告
```

---

## 技术实现细节

### 1. 缓存和性能优化

**三层缓存**：
```
1. Team-level: MCPClientManager.teamClientsCache
   - 缓存每个团队的所有 MCPClient 实例
   - 首次访问时加载，后续直接返回

2. Client-level: MCPClient._toolsCache, _metadataCache
   - 缓存每个 MCP 的 tools 和 metadata
   - 避免重复的 RPC 调用

3. Loading Promise: MCPClientManager.loadingPromises
   - 防止并发请求重复加载同一团队的配置
   - 并发安全机制
```

**缓存失效**：
```typescript
// 当 TeamConfig 更新时
export async function upsertTeamConfig(teamId: number, key: TeamConfigName, value: Json) {
  await prisma.teamConfig.upsert({ ... });

  // 失效缓存
  revalidateTag(`team-config-${teamId}-${key}`);

  // 如果是 MCP 配置，重新加载 clients
  if (key === TeamConfigName.mcp) {
    await reloadTeamMcpClients(teamId);
  }
}
```

### 2. 错误处理和降级

```typescript
// src/ai/tools/mcp/client.ts:543-564
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
    rootLogger.error({ error: result.reason, mcpName: name }, `MCP client ${name} failed to load`);
  }
}
```

**降级策略**：
- **单个 MCP 失败不影响其他 MCP**：使用 `Promise.allSettled`
- **失败的 MCP 跳过**：只加载成功的 clients
- **详细日志**：记录失败原因，便于调试

### 3. 安全性

**Headers 隔离**：
```typescript
// 每个团队的 MCP 配置独立
const mcpConfig = await getTeamConfig(teamId, TeamConfigName.mcp);

// Headers 在服务端处理，不暴露给客户端
const client = await createMCPClient({
  transport: {
    type: config.type,
    url: config.url,
    headers: config.headers,  // 仅在服务端使用
  },
});
```

**团队隔离**：
- 每个团队的 MCP 配置完全独立
- 团队 A 无法访问团队 B 的 MCP 服务器
- API Keys 和 tokens 存储在 TeamConfig 中，数据库级别隔离

---

## 10 个常见问题

### 1. MCP 和普通工具有什么区别？

| 维度 | MCP 工具 | 普通工具（内置） |
|------|---------|--------------|
| **定义方式** | 外部 MCP 服务器提供 | 代码内定义 |
| **可扩展性** | 无限（任何 MCP 服务器） | 有限（预定义） |
| **配置方式** | 团队级 JSON 配置 | 代码部署 |
| **更新速度** | 即时（更新配置） | 需重新部署 |
| **数据访问** | 可访问团队私有数据 | 仅访问公开数据 |
| **使用门槛** | 团队管理员配置 | 需开发人员 |

**示例对比**：

**内置工具**（`webSearch`）：
```typescript
// src/ai/tools/web/webSearch.ts
export const webSearchTool = tool({
  description: "Search the web for information",
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // 调用公开搜索 API
    return await searchWeb(query);
  },
});
```

**MCP 工具**（`query_database`）：
```typescript
// 外部 MCP 服务器提供
// 团队配置 URL 和 API Key
// Agent 自动获取并使用
```

### 2. 如何判断 Agent 是否使用了 MCP？

**方法 1：查看日志**

```bash
# 服务端日志
Loaded MCP clients: 2 (mcpClients: ["JupyterHub", "PostgreSQL"])
```

**方法 2：观察工具调用**

```
AI 思考：我需要查询数据库...

Tool Call: query_database
Parameters: {
  query: "SELECT * FROM sales WHERE date >= '2025-10-01'"
}

结果：[数据库查询结果]
```

**方法 3：检查 TeamConfig**

```sql
SELECT value FROM "TeamConfig"
WHERE "teamId" = 123 AND key = 'mcp';
```

### 3. MCP 配置错误会导致整个系统不可用吗？

**不会**。系统有完善的错误处理和降级机制：

1. **单个 MCP 失败不影响其他**：
   ```typescript
   // 使用 Promise.allSettled，单个失败不影响整体
   const results = await Promise.allSettled(
     configs.map(([name, config]) => loadClient(name, config))
   );
   ```

2. **失败的 MCP 自动跳过**：
   ```typescript
   if (result.status === "fulfilled") {
     clients.set(name, result.value);
   } else {
     logger.error(`MCP ${name} failed to load`);
     // 继续处理其他 MCP
   }
   ```

3. **Agent 正常工作**：
   - 如果所有 MCP 都失败，`mcpClients.length === 0`
   - `createSubAgent` tool 不会被注入
   - Agent 使用内置工具正常工作

**示例**：
```
配置了 3 个 MCP: JupyterHub, PostgreSQL, FileSystem
- JupyterHub: 成功加载 ✅
- PostgreSQL: 连接失败 ❌
- FileSystem: 成功加载 ✅

结果：Agent 可以使用 JupyterHub 和 FileSystem，PostgreSQL 不可用
```

### 4. 如何调试 MCP 配置？

**Step 1: 检查配置格式**

```typescript
// 确保 JSON 格式正确
const config = {
  "ServerName": {
    "type": "http",  // 必须是 "http" 或 "sse"
    "url": "https://...",  // 必须是完整 URL
    "headers": { ... },  // 可选
    "prompt": "..."  // 可选，推荐添加
  }
};
```

**Step 2: 查看加载日志**

```bash
# 成功日志
INFO: Loaded MCP clients for team (teamId: 123, mcpCount: 2, mcpNames: ["JupyterHub", "PostgreSQL"])

# 失败日志
ERROR: MCP client JupyterHub failed to load (error: "Connection refused", url: "https://jupyter.company.com/mcp")
```

**Step 3: 测试 MCP 服务器**

```bash
# 使用 curl 测试 MCP endpoint
curl -X POST https://jupyter.company.com/mcp \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"method": "initialize"}'
```

**Step 4: 使用 Admin 工具**

```bash
# 运行 admin 工具查看 MCP 状态
pnpm admintool
> Test MCP Configuration
> Team ID: 123
> Result: [显示所有 MCP 的连接状态和可用工具]
```

### 5. MCP 的成本如何？

**MCP 本身无额外成本**（atypica.AI 不收费）

**实际成本来源**：

1. **LLM Token 消耗**：
   - Tool selection (gemini-2.5-flash): 1K - 3K tokens
   - Sub-agent execution (claude-sonnet-4-5): 5K - 20K tokens per task
   - 总计：约 6K - 23K tokens per MCP task

2. **MCP 服务器运行成本**：
   - 自建 MCP 服务器：服务器成本（$10-50/月，取决于规模）
   - 第三方 MCP 服务：按服务商定价

**示例（数据分析任务）**：
```
用户请求: "分析 Q4 销售数据并生成可视化"

Token 消耗:
- Tool selection (gemini-2.5-flash): 2K tokens ($0.001)
- Sub-agent execution (claude-sonnet-4-5):
  - PostgreSQL query: 3K tokens
  - Jupyter analysis: 8K tokens
  - Result formatting: 2K tokens
  - 小计: 13K tokens ($0.013)

总成本: ~$0.014 per task
```

**对比**：
- 使用 MCP：$0.014/task，自动化
- 人工分析：1-2 小时，$50-100/小时

### 6. 支持哪些类型的 MCP 服务器？

**理论上支持所有符合 MCP 协议的服务器**

**常见 MCP 类型**：

1. **数据源 MCP**：
   - PostgreSQL, MySQL, MongoDB
   - Redis, Elasticsearch
   - S3, Google Cloud Storage

2. **开发工具 MCP**：
   - GitHub, GitLab
   - Jira, Linear
   - Slack, Teams

3. **分析工具 MCP**：
   - Jupyter, R Studio
   - Tableau, Looker
   - Excel, Google Sheets

4. **文件系统 MCP**：
   - Local file system
   - Network drives
   - Cloud storage (Dropbox, OneDrive)

5. **自定义 MCP**：
   - 公司内部系统
   - 专用工具
   - Legacy 系统接口

**查找 MCP 服务器**：
- 官方列表：https://modelcontextprotocol.org/servers
- GitHub：搜索 "mcp server"
- 自建：使用 MCP SDK 构建

### 7. 如何自建 MCP 服务器？

**方法 1：使用 MCP SDK（推荐）**

```typescript
// server.ts
import { createMCPServer } from "@modelcontextprotocol/sdk";

const server = createMCPServer({
  name: "CompanyDataMCP",
  version: "1.0.0",

  tools: {
    query_sales: {
      description: "Query sales data",
      parameters: { /* ... */ },
      execute: async (params) => {
        // 查询内部数据库
        const result = await db.query(params.sql);
        return result;
      },
    },
  },

  resources: {
    // 定义可访问的资源
  },
});

server.listen(8080);
```

**方法 2：使用现有 MCP 实现**

```bash
# 例如：使用 postgresql-mcp
git clone https://github.com/example/postgresql-mcp
cd postgresql-mcp
npm install
npm start
```

**方法 3：集成到现有系统**

```python
# Python FastAPI 示例
from fastapi import FastAPI
from mcp_python_sdk import MCPServer

app = FastAPI()
mcp = MCPServer(app)

@mcp.tool("analyze_data")
async def analyze_data(data_id: str):
    # 你的业务逻辑
    return await internal_analysis_system.analyze(data_id)
```

**部署**：
```bash
# Docker 部署
docker run -p 8080:8080 company-mcp-server

# 配置到 atypica.AI
{
  "CompanyMCP": {
    "type": "http",
    "url": "http://mcp-server.company.internal:8080",
    "headers": { "X-API-Key": "secret" }
  }
}
```

### 8. MCP 和 Reference Study 有什么区别？

| 维度 | MCP 集成 | Reference Study |
|------|---------|----------------|
| **定位** | 外部工具和数据源 | 历史研究内容 |
| **数据类型** | 实时数据、系统API | 静态研究报告 |
| **访问方式** | Tool calls（工具调用） | Context injection（上下文注入） |
| **更新频率** | 实时（每次查询） | 静态（研究完成时） |
| **典型用例** | 查询数据库、运行代码 | 参考历史洞察、复用研究逻辑 |
| **配置级别** | 团队级 | 研究级 |

**协同使用示例**：
```
用户: 继续上次的气泡水研究，但这次分析最新的销售数据

Agent 工作流:
1. 加载 Reference Study (上次的气泡水研究)
   → 获取研究逻辑、分析框架

2. 使用 MCP (CompanyDB)
   → 查询最新销售数据

3. 结合两者
   → 用历史研究的框架分析最新数据
   → 对比趋势变化
```

### 9. 个人用户能使用 MCP 吗？

**目前不支持**。MCP 是团队级功能。

**原因**：
1. **安全性**：MCP 通常连接敏感数据源（数据库、内部系统）
2. **管理性**：需要团队管理员配置和管理
3. **成本控制**：团队级配额和计费

**未来计划**：
- 个人用户可能支持"沙盒 MCP"（限制访问权限）
- 预置的公开 MCP 服务器（如公开数据集）

**当前解决方案**：
- 创建单人团队
- 配置个人 MCP 服务器
- 作为团队 owner 使用

### 10. 如何监控 MCP 使用情况？

**方法 1：日志监控**

```typescript
// 自动记录的日志
logger.info({
  msg: "MCP tool called",
  mcpName: "JupyterHub",
  toolName: "run_python_code",
  userId: 123,
  duration: 2345,
});
```

**方法 2：Token 统计**

```typescript
// Token 消耗自动记录
await statReport("tokens", totalTokens, {
  reportedBy: "sub-agent",
  mcpName: "JupyterHub",
  userId: 123,
});
```

**方法 3：Admin Dashboard**（未来功能）

```
MCP 使用统计:
- Total MCP calls: 1,234
- Most used MCP: JupyterHub (456 calls)
- Average duration: 3.2s
- Token consumption: 2.3M tokens
- Top users: [Alice (123 calls), Bob (98 calls)]
```

---

## 总结：MCP 集成的价值

### 核心优势

1. **无限扩展**：连接任何支持 MCP 协议的工具和数据源
2. **零代码配置**：团队管理员 JSON 配置，无需开发部署
3. **智能选择**：AI 自动判断使用哪些 MCP 工具
4. **团队隔离**：每个团队独立配置，数据安全隔离
5. **即时生效**：配置更新后立即可用，无需重启

### 适用场景

- **数据分析团队**：访问内部数据库、Jupyter 分析
- **开发团队**：GitHub 代码搜索、项目文件访问
- **市场团队**：内部市场数据、竞品信息整合
- **任何需要访问私有数据/工具的团队**

### 技术亮点

- **三层缓存**：Team → Client → Tool/Metadata
- **并发安全**：loadingPromises 防止重复加载
- **错误降级**：单个 MCP 失败不影响其他
- **Two-Step execution**：智能选择 MCP + Sub-agent 执行
- **安全隔离**：团队级配置和权限管理

### 代码位置总结

| 功能 | 文件路径 |
|------|---------|
| **MCP Client** | `src/ai/tools/mcp/client.ts:119-380` |
| **MCP Manager** | `src/ai/tools/mcp/client.ts:382-644` |
| **Team Config Types** | `src/app/team/teamConfig/types.ts` |
| **createSubAgent Tool** | `src/app/(study)/tools/createSubAgent/index.ts` |
| **Agent Integration** | `src/app/(study)/agents/baseAgentRequest.ts:191-235` |
| **Database Schema** | `prisma/schema.prisma:41-52` (TeamConfig) |

---

**MCP 让 AI Agent 从"固定工具集"变成"无限可能"，团队可以根据需求自由扩展能力。**
