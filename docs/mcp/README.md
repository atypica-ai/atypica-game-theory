# MCP 工具集成（Model Context Protocol）

## 概述

本功能将 Model Context Protocol (MCP) 工具集成到 atypica-llm-app 中，使研究代理能够使用来自 MCP 服务器的外部工具。实现包括：

1. **团队级别 MCP 配置**：每个团队可以配置自己的 MCP 服务器，配置存储在数据库中
2. **通用子代理工具（createSubAgent）**：根据任务需求自动选择 MCP 工具并执行任务
3. **管理员配置界面**：为团队管理 MCP 配置和自定义系统提示词
4. **前端可视化**：实时显示子代理执行步骤和工具调用

## 核心功能

### 1. 团队级别 MCP 配置

#### TeamConfig 数据库表

**位置**：`prisma/schema.prisma`

```prisma
model TeamConfig {
  id     Int    @id @default(autoincrement())
  teamId Int
  team   Team   @relation("TeamConfig", fields: [teamId], references: [id], onDelete: Cascade)
  key    String @db.VarChar(255)  // TeamConfigName 枚举值
  value  Json   @default("{}")    // 配置内容（JSON）

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([teamId, key])
}
```

#### 配置类型（TeamConfigName）

**位置**：`src/app/team/teamConfig/types.ts`

```typescript
export enum TeamConfigName {
  mcp = "mcp",                           // MCP 服务器配置
  studySystemPrompt = "studySystemPrompt" // 自定义系统提示词
}
```

#### MCP 配置格式

存储在 `TeamConfig.value` 中的 JSON 格式：

```json
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://example.com/mcp",
    "headers": { "Authorization": "Bearer token" },
    "prompt": "用于数据分析和 Jupyter 笔记本操作的 MCP 服务器"
  },
  "FileSystemMCP": {
    "type": "sse",
    "url": "https://example.com/mcp-sse",
    "prompt": "用于文件系统操作的 MCP 服务器"
  }
}
```

#### 配置管理 API

**位置**：`src/app/team/teamConfig/lib.ts`

- `getTeamConfig<T>(teamId, key)`：获取团队配置（带 1 小时缓存）
- `getTeamConfigWithDefault<T>(teamId, key, defaultValue)`：获取配置，不存在时返回默认值
- `setTeamConfig(teamId, key, value)`：设置或更新配置
- `deleteTeamConfig(teamId, key)`：删除配置

缓存策略：
- 缓存时间：1 小时
- 缓存标签：`team-config-${teamId}`、`team-config-${teamId}-${key}`
- 配置更新时自动刷新缓存

### 2. MCP 客户端架构

#### MCPClient 类

**位置**：`src/ai/tools/mcp/client.ts`

封装单个 MCP 客户端的所有操作：

```typescript
class MCPClient {
  // 懒加载和缓存
  async getTools(): Promise<MCPTools>
  async getMetadata(): Promise<MCPMetadata>
  async getPromptContents(): Promise<string>

  // 获取提示词详情
  async getPromptDetail(promptName: string): Promise<MCPPromptDetail>
}
```

特性：
- **懒加载**：工具和元数据按需加载
- **缓存**：加载后缓存在内存中，避免重复 API 调用
- **错误处理**：优雅的错误处理和日志记录

#### MCPClientManager 类

管理团队级别的 MCP 客户端：

```typescript
class MCPClientManager {
  // 获取团队的 MCP 客户端列表
  async getClientsForTeam(teamId: number): Promise<MCPClient[]>

  // 获取团队的所有工具
  async getToolsForTeam(teamId: number): Promise<MCPTools>

  // 获取团队的所有元数据
  async getMetadataForTeam(teamId: number): Promise<MCPMetadata[]>

  // 获取选中 MCP 的提示词内容
  async getPromptContentsForMcps(teamId: number, mcpNames: string[]): Promise<string>

  // 重载团队的 MCP 客户端（配置变更后）
  async reloadTeam(teamId: number): Promise<void>
}
```

特性：
- **团队隔离**：每个团队的 MCP 客户端独立管理
- **动态重载**：配置变更后可以重载客户端
- **跨团队访问**：管理员可以访问任意团队的 MCP 元数据

#### 核心 API

```typescript
// 获取团队的所有 MCP 工具（用于主代理）
export async function getAllMcpToolsForTeam(teamId: number | null): Promise<MCPTools>

// 获取团队的 MCP 客户端列表（用于子代理）
export async function getMcpClientsForTeam(teamId: number | null): Promise<MCPClient[]>

// 获取团队的 MCP 元数据（用于管理员界面和工具选择）
export async function getAllMcpMetadataForTeam(teamId: number | null): Promise<MCPMetadata[]>

// 重载团队的 MCP 客户端（配置变更后调用）
export async function reloadTeamMcpClients(teamId: number): Promise<void>

// 跨团队访问（仅管理员）
export async function getAllMcpMetadataAcrossTeams(teamIds: number[]): Promise<Record<number, MCPMetadata[]>>
```

### 3. 通用子代理工具（createSubAgent）

**位置**：`src/ai/tools/experts/createSubAgent/`

#### 两阶段执行流程

##### 第一阶段：工具选择

使用 Gemini 2.5 Flash 根据任务需求智能选择 MCP 工具：

```typescript
async function selectMcpTools({
  taskRequirement,
  clients,
  locale,
  ...
}): Promise<string[]> // 返回选中的 MCP 服务器名称列表
```

系统提示词：
```
You are a tool selection assistant. Your task is to analyze the user's task requirement
and select the most appropriate MCP servers from the available options.

Available MCP Servers:
- JupyterDataMCP: 用于数据分析和 Jupyter 笔记本操作
  Tools: initialize_bi_task, execute_bi_code, get_task_result
- FileSystemMCP: 用于文件系统操作
  Tools: read_file, write_file, list_directory
...
```

##### 第二阶段：任务执行

使用 Claude 3.7 Sonnet 执行任务（最多 20 步）：

```typescript
async function runSubAgentStream({
  taskRequirement,
  outputFormat,
  selectedClients,
  locale,
  teamId,
  ...
}): AsyncIterableIterator<TextStreamPart<MCPTools>>
```

特性：
- **动态系统提示词**：使用选中 MCP 服务器的提示词内容
- **endSubAgent 工具**：允许子代理输出最终结果
- **步数限制**：最多 20 步，避免无限循环
- **流式响应**：实时返回执行过程

#### 工具定义

```typescript
export const createSubAgentTool = ({
  userId,
  teamId,
  locale,
  clients, // MCPClient[]
  ...
}: AgentToolConfigArgs & { clients: MCPClient[] }) =>
  tool({
    description: "创建一个子代理来执行特定任务...",
    parameters: createSubAgentInputSchema,
    execute: async ({ taskRequirement, outputFormat }) => {
      // 1. 选择工具
      const selectedMcpNames = await selectMcpTools(...)

      // 2. 创建子代理会话
      const subAgentChat = await createUserChat(...)

      // 3. 执行任务
      for await (const chunk of runSubAgentStream(...)) {
        // 流式处理和持久化
      }

      // 4. 返回结果
      return {
        result: finalResult,
        subAgentChatId,
        subAgentChatToken
      }
    }
  })
```

### 4. 系统提示词定制

**位置**：`src/ai/prompt/study/study.ts`

支持团队级别的自定义系统提示词：

```typescript
export const studySystem = async ({
  locale,
  briefStatus,
  teamId
}: {
  locale: Locale;
  briefStatus?: "CLARIFIED" | "DRAFT";
  teamId?: number | null;
}) => {
  // 获取团队自定义提示词
  const teamSystemPrompt = await getTeamConfigWithDefault<Record<string, string>>(
    teamId ?? null,
    TeamConfigName.studySystemPrompt,
    { "zh-CN": "", "en-US": "" } satisfies TeamConfigValue["studySystemPrompt"],
  );

  // 构建提示词
  return `
    ${basePrompt}

    ${teamSystemPrompt[locale] ? `
      <额外信息补充>
      ${teamSystemPrompt[locale]}
      </额外信息补充>
    ` : ''}

    <信息收集>
    - 根据工具的使用规则，使用更恰当的工具完成不同种类的任务
    - 如数据分析、企业文档检索等可以使用 createSubAgent 工具
    - 如果没有比联网搜索更恰当的其他工具，则使用 webSearch 工具
    </信息收集>
  `;
}
```

### 5. 管理员配置界面

**位置**：`src/app/admin/team-configs/`

#### 页面功能

- 查看所有团队的配置
- 为团队添加/编辑 MCP 配置
- 为团队添加/编辑自定义系统提示词
- 预览 MCP 元数据（工具列表、资源、提示词）
- 配置修改后自动重载 MCP 客户端

#### Server Actions

**位置**：`src/app/admin/team-configs/actions.ts`

```typescript
// 获取所有团队及其配置
export async function fetchTeamsWithConfigs(): Promise<ServerActionResult<TeamWithConfigs[]>>

// 设置或更新团队配置
export async function upsertTeamConfig(
  teamId: number,
  key: TeamConfigName,
  value: unknown
): Promise<ServerActionResult<void>>

// 删除团队配置
export async function removeTeamConfig(
  teamId: number,
  key: TeamConfigName
): Promise<ServerActionResult<void>>

// 获取团队的 MCP 元数据（用于预览）
export async function fetchTeamMcpMetadata(
  teamId: number
): Promise<ServerActionResult<MCPMetadata[]>>

// 跨团队获取 MCP 元数据（仅管理员）
export async function fetchMcpMetadataAcrossTeams(
  teamIds: number[]
): Promise<ServerActionResult<Record<number, MCPMetadata[]>>>
```

配置更新流程：
1. 用户在管理界面编辑配置
2. 调用 `upsertTeamConfig()` 保存到数据库
3. 刷新 Next.js 缓存（`revalidateTag`）
4. 如果是 MCP 配置，调用 `reloadTeamMcpClients()` 重载客户端
5. 新的 MCP 工具立即可用

### 6. 前端可视化

#### 子代理控制台

**位置**：`src/app/(study)/study/console/CreateSubAgentConsole.tsx`

显示内容：
- 工具选择阶段：选中的 MCP 服务器列表
- 任务执行阶段：实时显示执行步骤和工具调用
- 最终结果：子代理的输出

特性：
- 实时轮询更新（1 秒间隔）
- 使用 `StreamSteps` 组件显示消息流
- 支持重放模式（20 秒等待时间）

#### 结果消息

**位置**：`src/ai/tools/experts/ToolMessage/CreateSubAgentResultMessage.tsx`

显示子代理的最终执行结果，包括：
- 任务结果文本
- 子代理会话 ID（用于调试）
- 子代理会话 Token（用于查看完整对话）

## 集成点

### 主代理集成

**位置**：`src/app/(study)/api/chat/study/studyAgentRequest.ts`

```typescript
// 1. 获取团队的 MCP 工具和客户端
const mcpTools = await getAllMcpToolsForTeam(session?.teamId ?? null);
const mcpClients = await getMcpClientsForTeam(session?.teamId ?? null);

// 2. 构建工具集
const tools = {
  ...coreTools,
  ...mcpTools, // 直接注入 MCP 工具（主代理可以直接使用）
  ...(mcpClients.length > 0 ? {
    createSubAgent: createSubAgentTool({
      clients: mcpClients,
      teamId: session?.teamId,
      ...
    })
  } : {})
};

// 3. 构建系统提示词（包含团队自定义提示词）
const systemPrompt = await studySystem({
  locale,
  briefStatus,
  teamId: session?.teamId
});

// 4. 执行流式对话
const result = streamText({
  model: llm("claude-3.7-sonnet"),
  system: systemPrompt,
  tools,
  ...
});
```

### 工具控制台路由

**位置**：`src/app/(study)/study/ToolConsole.tsx`

```typescript
if (toolName === "createSubAgent") {
  return <CreateSubAgentConsole callState={callState} />;
}
```

### 工具结果渲染

**位置**：`src/ai/tools/ui.tsx`

```typescript
if (toolName === "createSubAgent") {
  return <CreateSubAgentResultMessage result={args} />;
}
```

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Database (Prisma)                        │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │     Team     │────────▶│  TeamConfig  │                      │
│  │              │         │ - mcp        │                      │
│  │              │         │ - studySystemPrompt                 │
│  └──────────────┘         └──────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ getTeamConfig()
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Client Management                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MCPClientManager (Singleton)                 │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Team 1: [MCPClient("JupyterData"), ...]          │  │  │
│  │  │  Team 2: [MCPClient("FileSystem"), ...]           │  │  │
│  │  │  Team 3: [MCPClient("WebSearch"), ...]            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Each MCPClient:                                                 │
│  - Lazy loading & caching                                        │
│  - Tools, Metadata, Prompts                                      │
│  - Error handling                                                │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
        getAllMcpToolsForTeam()    getMcpClientsForTeam()
                    │                           │
                    ▼                           ▼
┌────────────────────────────────┐  ┌──────────────────────────────┐
│       Main Agent (Study)       │  │   createSubAgent Tool        │
│                                 │  │                              │
│ Tools:                          │  │ Phase 1: Tool Selection      │
│ - All MCP tools directly        │  │  (Gemini 2.5 Flash)          │
│ - createSubAgent (conditional)  │  │                              │
│ - webSearch, interview, ...     │  │ Phase 2: Task Execution      │
│                                 │  │  (Claude 3.7 Sonnet)         │
│ System Prompt:                  │  │  with selected MCP tools     │
│ - Base prompt                   │  │                              │
│ - Team custom prompt            │  │ endSubAgent tool:            │
│ - Tool usage instructions       │  │  Output final result         │
└────────────────────────────────┘  └──────────────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                ▼
                    ┌────────────────────────┐
                    │   Frontend Console     │
                    │ - CreateSubAgentConsole│
                    │ - Result Messages      │
                    │ - Real-time Updates    │
                    └────────────────────────┘
```

## 数据流

### MCP 配置流程

```
Admin UI
  │
  │ upsertTeamConfig(teamId, "mcp", mcpConfig)
  ▼
Database (TeamConfig table)
  │
  │ revalidateTag("team-config-{teamId}")
  ▼
Next.js Cache (Invalidated)
  │
  │ reloadTeamMcpClients(teamId)
  ▼
MCPClientManager
  │
  │ Clear team cache
  │ Re-initialize MCP clients
  ▼
New MCP Tools Available
```

### createSubAgent 执行流程

```
Main Agent
  │
  │ Calls: createSubAgent({ taskRequirement, outputFormat })
  ▼
Phase 1: Tool Selection (Gemini 2.5 Flash)
  │
  │ Input: Task requirement + All MCP metadata
  │ Output: ["JupyterDataMCP", "FileSystemMCP"]
  ▼
Phase 2: Task Execution (Claude 3.7 Sonnet)
  │
  │ System Prompt: Base + MCP prompts
  │ Tools: Selected MCP tools + endSubAgent
  │
  │ ┌──────────────────────┐
  │ │ Step 1: Tool call A  │
  │ │ Step 2: Tool call B  │──▶ Streamed to Frontend Console
  │ │ Step 3: Tool call C  │
  │ │ ...                  │
  │ │ Step N: endSubAgent  │
  │ └──────────────────────┘
  ▼
Final Result
  │
  │ Return to Main Agent
  ▼
Main Agent continues
```

## 功能映射表

### 核心功能

| 功能                 | 文件                                      | 关键函数/类                              |
| -------------------- | ----------------------------------------- | ---------------------------------------- |
| 数据库模型           | `prisma/schema.prisma`                    | `TeamConfig` model                       |
| 配置管理             | `src/app/team/teamConfig/lib.ts`          | `getTeamConfig()`, `setTeamConfig()`     |
| MCP 客户端类         | `src/ai/tools/mcp/client.ts`              | `MCPClient`, `MCPClientManager`          |
| 获取团队 MCP 工具    | `src/ai/tools/mcp/client.ts`              | `getAllMcpToolsForTeam()`                |
| 获取团队 MCP 客户端  | `src/ai/tools/mcp/client.ts`              | `getMcpClientsForTeam()`                 |
| 获取团队 MCP 元数据  | `src/ai/tools/mcp/client.ts`              | `getAllMcpMetadataForTeam()`             |
| 重载 MCP 客户端      | `src/ai/tools/mcp/client.ts`              | `reloadTeamMcpClients()`                 |

### createSubAgent 工具

| 功能         | 文件                                         | 关键函数                       |
| ------------ | -------------------------------------------- | ------------------------------ |
| 工具定义     | `src/ai/tools/experts/createSubAgent/index.ts` | `createSubAgentTool()`         |
| 工具选择     | `src/ai/tools/experts/createSubAgent/index.ts` | `selectMcpTools()`             |
| 任务执行     | `src/ai/tools/experts/createSubAgent/index.ts` | `runSubAgentStream()`          |
| 输入输出模式 | `src/ai/tools/experts/createSubAgent/types.ts` | Schema 定义                    |

### 管理员界面

| 功能           | 文件                                        | 关键函数                          |
| -------------- | ------------------------------------------- | --------------------------------- |
| 配置页面       | `src/app/admin/team-configs/page.tsx`       | -                                 |
| 页面组件       | `src/app/admin/team-configs/TeamConfigsPageClient.tsx` | -                  |
| Server Actions | `src/app/admin/team-configs/actions.ts`     | `upsertTeamConfig()`, `fetchTeamsWithConfigs()` |

### 前端可视化

| 功能         | 文件                                                             | 关键组件                         |
| ------------ | ---------------------------------------------------------------- | -------------------------------- |
| 控制台       | `src/app/(study)/study/console/CreateSubAgentConsole.tsx`        | `CreateSubAgentConsole`          |
| 控制台路由   | `src/app/(study)/study/ToolConsole.tsx`                          | 路由逻辑                         |
| 结果消息     | `src/ai/tools/experts/ToolMessage/CreateSubAgentResultMessage.tsx` | `CreateSubAgentResultMessage`    |
| 结果渲染     | `src/ai/tools/ui.tsx`                                            | 渲染逻辑                         |
| 渐进式消息   | `src/app/(study)/study/hooks/useProgressiveMessages.ts`          | 重放模式配置                     |

### 集成点

| 功能             | 文件                                                  | 说明                                      |
| ---------------- | ----------------------------------------------------- | ----------------------------------------- |
| 主代理集成       | `src/app/(study)/api/chat/study/studyAgentRequest.ts` | 加载 MCP 工具和客户端，构建工具集       |
| 系统提示词定制   | `src/ai/prompt/study/study.ts`                        | 集成团队自定义提示词                     |
| 工具注册         | `src/ai/tools/tools.ts`                               | 将 `createSubAgent` 添加到工具列表       |

## 使用指南

### 为团队配置 MCP 服务器

1. 访问管理员界面：`/admin/team-configs`
2. 选择目标团队
3. 添加 MCP 配置（key: `mcp`）：
   ```json
   {
     "JupyterDataMCP": {
       "type": "http",
       "url": "https://your-mcp-server.com/mcp",
       "headers": { "Authorization": "Bearer YOUR_TOKEN" },
       "prompt": "用于数据分析的 MCP 服务器"
     }
   }
   ```
4. 保存配置，系统会自动重载 MCP 客户端

### 为团队配置自定义系统提示词

1. 访问管理员界面：`/admin/team-configs`
2. 选择目标团队
3. 添加系统提示词配置（key: `studySystemPrompt`）：
   ```json
   {
     "zh-CN": "你是一个专注于金融行业的研究助手...",
     "en-US": "You are a research assistant focused on finance industry..."
   }
   ```
4. 保存配置，新的提示词立即生效

### 主代理直接使用 MCP 工具

MCP 工具会自动注入到主代理的工具集中，主代理可以直接调用：

```
用户：请帮我分析这个数据表的用户行为
主代理：好的，我来使用数据分析工具...
        [直接调用 JupyterDataMCP 的工具]
```

### 使用 createSubAgent 执行复杂任务

主代理可以委托 createSubAgent 执行复杂任务：

```
用户：请分析过去一年的销售数据并生成报告
主代理：这个任务需要多步骤的数据分析，我来创建一个子代理处理...
        [调用 createSubAgent 工具]

createSubAgent：
  阶段1：选择工具 -> ["JupyterDataMCP"]
  阶段2：执行任务
    - 步骤1：初始化分析任务
    - 步骤2：加载销售数据
    - 步骤3：执行分析代码
    - 步骤4：生成图表
    - 步骤5：汇总结果
    - 步骤6：[调用 endSubAgent] 输出最终报告

主代理：分析完成，以下是报告...
```

## 性能优化

1. **懒加载**：MCP 工具和元数据按需加载
2. **多级缓存**：
   - 数据库配置缓存（Next.js `unstable_cache`，1 小时）
   - MCP 客户端缓存（内存，直到配置变更）
   - 元数据缓存（内存，按 MCP 客户端）
3. **增量刷新**：使用 Next.js 缓存标签实现精准刷新
4. **团队隔离**：每个团队的 MCP 客户端独立管理，互不影响

## 安全考虑

1. **权限控制**：只有管理员可以配置 MCP 服务器
2. **团队隔离**：团队只能访问自己的 MCP 工具
3. **配置验证**：MCP 配置格式验证，防止注入攻击
4. **错误隔离**：单个 MCP 服务器错误不影响其他服务器
5. **日志记录**：完整的操作日志，便于审计

## 故障排查

### MCP 工具未加载

1. 检查 TeamConfig 表中是否有配置
2. 检查配置格式是否正确
3. 检查 MCP 服务器 URL 是否可访问
4. 查看日志：搜索 `mcpName: "YourMCPName"`

### 配置更新未生效

1. 确认已调用 `revalidateTag()`
2. 确认已调用 `reloadTeamMcpClients()`
3. 检查缓存是否正确刷新

### createSubAgent 无法使用

1. 检查 `mcpClients.length > 0`（没有 MCP 客户端时不启用）
2. 检查工具选择阶段是否成功
3. 查看子代理控制台的执行日志

---
