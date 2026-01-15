# MCP 集成能力 - 让 AI 接入你的工具和数据

## 核心理念

MCP (Model Context Protocol) 是一个开放标准协议,让 AI 能够安全地访问外部工具和数据源。atypica.AI 的 MCP 集成能力让团队可以:

1. **接入自定义工具**:将团队内部工具集成到研究流程中
2. **连接数据源**:直接访问 Jupyter Notebook、内部数据库、API
3. **扩展 AI 能力**:为 AI 添加团队专属的研究能力

**类比**:
- **传统 AI**:只能用预设的工具(webSearch, interviewChat 等)
- **MCP 集成**:AI 可以调用你团队的任何工具(如内部数据分析工具、专有 API)

---

## 对比总览:有 vs 无 MCP 集成

| **场景** | **无 MCP 集成** | **有 MCP 集成** |
|---------|----------------|----------------|
| **数据源** | 仅公开网络数据 | 可访问内部数据库、Jupyter Notebook、私有 API |
| **工具扩展** | 仅使用 atypica 内置工具 | 可调用团队自定义工具 |
| **研究深度** | 浅层(公开信息) | 深层(内部数据 + 公开信息) |
| **团队定制** | 通用研究流程 | 团队专属研究工作流 |
| **数据安全** | 数据离开团队边界 | 数据留在团队内部(通过内部 MCP 服务器) |

### 真实案例对比

**场景**:分析用户行为数据

**无 MCP 集成**(30 分钟):
```
用户:"分析我们产品的用户行为数据"

AI:无法访问内部数据
   → 需要用户手动导出数据
   → 用户复制粘贴数据到对话框(受长度限制)
   → AI 基于不完整数据进行分析

结果:浅层分析,数据不完整
```

**有 MCP 集成**(5 分钟):
```
用户:"分析我们产品的用户行为数据"

AI:调用团队的 JupyterDataMCP
   → 直接访问 Jupyter Notebook 中的数据分析结果
   → 自动获取最新数据和可视化图表
   → 基于完整数据深度分析

结果:深度分析,数据完整,自动化
```

**效率提升**:
- **时间**:30 分钟 → 5 分钟(节省 83%)
- **数据完整性**:不完整 → 完整(100%)
- **自动化**:手动 → 自动

---

## MCP 是什么?

### 官方定义

**Model Context Protocol (MCP)** 是 Anthropic 推出的开放标准协议,定义了 AI 应用如何安全地连接外部工具和数据源。

**核心能力**:
1. **Tools**:AI 可调用的工具(如数据查询、API 调用)
2. **Resources**:AI 可访问的资源(如文件、数据库记录)
3. **Prompts**:预定义的提示词模板

### 工作原理

```
atypica.AI Agent
     ↓
MCP Client (atypica 内置)
     ↓
MCP Server (团队部署)
     ↓
团队数据/工具(Jupyter、数据库、API 等)
```

**关键特性**:
- **标准协议**:所有 MCP Server 遵循统一接口
- **安全隔离**:每个团队的 MCP Server 独立配置
- **灵活扩展**:支持 HTTP、SSE 等多种传输方式

---

## atypica.AI 的 MCP 集成架构

### 一、团队级配置

**每个团队可以配置自己的 MCP 服务器**:

**配置格式**:
```json
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://your-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-token"
    },
    "prompt": "Jupyter 数据分析工具,可访问团队的所有 Notebook"
  },
  "InternalDatabaseMCP": {
    "type": "sse",
    "url": "https://db-server.com/mcp",
    "headers": {
      "X-API-Key": "your-api-key"
    },
    "prompt": "内部数据库查询工具,支持用户行为、交易数据查询"
  }
}
```

**配置位置**:
- **数据库**: `TeamConfig` 表,`name = "mcp"`
- **管理界面**: 团队管理后台 → MCP 配置

---

### 二、客户端管理 (MCPClientManager)

**MCPClientManager** 负责管理团队的 MCP 客户端:

**特性**:
```typescript
// src/ai/tools/mcp/client.ts
export class MCPClientManager {
  // 1. 懒加载:仅在首次访问时加载团队配置
  async getClientsForTeam(teamId: number): Promise<MCPClient[]>

  // 2. 缓存:加载后缓存在内存中,避免重复加载
  private teamClientsCache: Map<number, MCPClient[]>

  // 3. 热重载:配置更新时自动重新加载
  async reloadTeamClients(teamId: number): Promise<void>

  // 4. 元数据:获取所有 MCP Server 的工具、资源、提示词
  async getAllMetadataForTeam(teamId: number): Promise<MCPMetadata[]>
}
```

**使用方式**:
```typescript
// 在 baseAgentRequest 中自动加载团队的 MCP 工具
const manager = getMcpClientManager();
const mcpClients = teamId
  ? await manager.getClientsForTeam(teamId)
  : [];

// 加载所有 MCP 工具
const mcpToolsArray = await Promise.all(
  mcpClients.map((client) => client.getTools())
);

// 合并到 Agent 的工具集
const allTools = {
  ...config.tools,           // atypica 内置工具
  ...Object.assign({}, ...mcpToolsArray),  // 团队 MCP 工具
};
```

---

### 三、通用集成 (baseAgentRequest)

**MCP 工具在所有 Agent 中自动可用**:

**文件位置**: `src/app/(study)/agents/baseAgentRequest.ts`

**集成流程**:
```typescript
// Phase 4: Universal MCP and Team System Prompt
// =============================================================================

// 1. 加载团队的 MCP 客户端
const manager = getMcpClientManager();
const mcpClients = baseContext.teamId
  ? await manager.getClientsForTeam(baseContext.teamId)
  : [];

logger.info({
  msg: "Loaded MCP clients",
  mcpClients: mcpClients.length,
  teamId: baseContext.teamId,
});

// 2. 加载所有 MCP 工具
const mcpToolsArray = await Promise.all(
  mcpClients.map((client) => client.getTools())
);

// 3. 加载所有 MCP 提示词内容
const mcpPromptContents = await Promise.all(
  mcpClients.map((client) => client.getPromptContents())
);

// 4. 合并 MCP 提示词到系统提示
let finalSystemPrompt = config.systemPrompt;
if (mcpPromptContents.length > 0) {
  const mcpPromptsSection = mcpPromptContents
    .filter((content) => content.length > 0)
    .join("\n\n---\n\n");

  if (mcpPromptsSection) {
    finalSystemPrompt = `${config.systemPrompt}\n\n---\n\n${mcpPromptsSection}`;
  }
}

// 5. 合并 MCP 工具到 Agent 工具集
const allTools = {
  ...config.tools,
  ...Object.assign({}, ...mcpToolsArray),
};

// 6. 执行 Agent (MCP 工具已自动可用)
const response = streamText({
  model: llm(config.model),
  system: finalSystemPrompt,
  tools: allTools,  // 包含内置工具 + MCP 工具
  messages: cachedCoreMessages,
  // ...
});
```

**关键特性**:
- **自动加载**: 无需手动配置,baseAgentRequest 自动加载团队的 MCP 工具
- **通用可用**: 所有 Agent 类型(Study, Fast Insight, Product R&D)都支持 MCP 工具
- **提示词增强**: MCP Server 的提示词自动追加到系统提示词
- **工具合并**: MCP 工具和内置工具无缝合并

---

## 内置 MCP Server: DeepResearch

atypica.AI 提供了一个内置的 MCP Server - **DeepResearch**,供团队快速体验 MCP 集成。

### 功能特性

**DeepResearch** 是一个深度研究工具,集成了 Grok 模型:

**端点**: `/mcp/deepResearch`

**工具**:
- `atypica_deep_research`: 执行深度研究任务

**特性**:
1. **流式输出**: 支持 SSE (Server-Sent Events)实时流式返回
2. **进度通知**: 实时反馈研究进度
3. **双认证模式**: API Key 认证 + 内部服务认证

---

### 认证方式

#### 1. API Key 认证(推荐)

**使用场景**: 外部团队调用 DeepResearch MCP

**获取 API Key**:
1. 登录 atypica.AI
2. 进入账户设置 → API Keys
3. 生成个人 API Key (格式: `atypica_xxxxx`)

**请求示例**:
```bash
curl -X POST https://atypica.ai/mcp/deepResearch \
  -H "Authorization: Bearer atypica_xxxxx" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_deep_research",
      "arguments": {
        "query": "分析人工智能在商业研究中的应用",
        "expert": "auto"
      }
    },
    "id": 1
  }'
```

---

#### 2. 内部服务认证

**使用场景**: atypica 内部服务之间调用

**认证方式**:
- Header 1: `x-internal-secret` = 环境变量 `INTERNAL_API_SECRET`
- Header 2: `x-user-id` = 用户 ID (整数)

**请求示例**:
```bash
curl -X POST https://atypica.ai/mcp/deepResearch \
  -H "x-internal-secret: your-internal-secret" \
  -H "x-user-id: 123" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_deep_research",
      "arguments": {
        "query": "分析市场趋势"
      }
    },
    "id": 1
  }'
```

---

### 流式输出 (SSE)

**启用流式输出**:
- Header: `Accept: text/event-stream`
- 响应格式: SSE (Server-Sent Events)

**SSE 事件类型**:
```
event: message
data: {"progress": 0.1, "message": "开始研究..."}

event: message
data: {"progress": 0.5, "message": "正在搜索相关信息..."}

event: message
data: {"progress": 1.0, "message": "研究完成", "result": "..."}

event: done
data: {}
```

**禁用流式输出**:
- URL 参数: `?sse=0`
- 响应格式: JSON (一次性返回完整结果)

---

## 团队如何集成自定义 MCP

### 场景 1: 接入 Jupyter Notebook

**需求**: 团队有大量数据分析结果存储在 Jupyter Notebook 中,希望 AI 能直接访问这些分析结果。

**解决方案**:

#### Step 1: 部署 JupyterDataMCP Server

```python
# jupyter_mcp_server.py
from fastapi import FastAPI, Header
from pydantic import BaseModel

app = FastAPI()

class MCPRequest(BaseModel):
    jsonrpc: str
    method: str
    params: dict
    id: int

@app.post("/mcp")
async def mcp_endpoint(
    request: MCPRequest,
    authorization: str = Header(None)
):
    # 认证检查
    if not authorization or not authorization.startswith("Bearer "):
        return {"error": "Unauthorized"}

    token = authorization.replace("Bearer ", "")
    if token != "your-secret-token":
        return {"error": "Invalid token"}

    # 处理工具调用
    if request.method == "tools/call":
        tool_name = request.params["name"]
        arguments = request.params["arguments"]

        if tool_name == "query_notebook":
            notebook_path = arguments["notebook_path"]
            # 读取 Jupyter Notebook
            result = read_jupyter_notebook(notebook_path)
            return {
                "jsonrpc": "2.0",
                "result": {"content": [{"type": "text", "text": result}]},
                "id": request.id
            }

    # 列出可用工具
    if request.method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "result": {
                "tools": [{
                    "name": "query_notebook",
                    "description": "查询 Jupyter Notebook 中的数据分析结果",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "notebook_path": {
                                "type": "string",
                                "description": "Notebook 文件路径"
                            }
                        },
                        "required": ["notebook_path"]
                    }
                }]
            },
            "id": request.id
        }

def read_jupyter_notebook(path: str) -> str:
    # 读取并解析 Jupyter Notebook
    import nbformat
    with open(path, 'r') as f:
        nb = nbformat.read(f, as_version=4)

    # 提取所有输出
    results = []
    for cell in nb.cells:
        if cell.cell_type == 'code' and cell.outputs:
            for output in cell.outputs:
                if 'text' in output:
                    results.append(output['text'])

    return "\n\n".join(results)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### Step 2: 配置 MCP Server

在 atypica.AI 团队管理后台:

```json
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://your-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-secret-token"
    },
    "prompt": "Jupyter 数据分析工具。可以查询团队的 Jupyter Notebook,获取数据分析结果、可视化图表和统计信息。"
  }
}
```

#### Step 3: 使用

```
用户(在 atypica.AI):"分析用户留存率,参考 notebooks/retention_analysis.ipynb"

AI 自动调用 query_notebook 工具:
  → 参数: {"notebook_path": "notebooks/retention_analysis.ipynb"}
  → 获取 Notebook 中的分析结果
  → 基于结果回答用户问题

AI 回复:
"根据你的 retention_analysis.ipynb Notebook,以下是用户留存率分析:

- Day 1 留存率: 45%
- Day 7 留存率: 28%
- Day 30 留存率: 15%

关键发现:
1. Day 1 → Day 7 流失率达 38%(需优化新手引导)
2. 付费用户留存率是免费用户的 2.3 倍
3. 使用核心功能的用户留存率提升 60%

建议:
1. 优化新手引导流程
2. 引导用户使用核心功能
3. 设计付费转化路径"
```

---

### 场景 2: 接入内部数据库

**需求**: 直接查询内部 PostgreSQL 数据库,获取用户行为数据。

**解决方案**:

#### Step 1: 部署 DatabaseMCP Server

```typescript
// database_mcp_server.ts
import express from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  host: 'localhost',
  database: 'your_db',
  user: 'your_user',
  password: 'your_password',
});

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  // 认证检查
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ error: 'Unauthorized' });
  }

  // 列出工具
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [{
          name: 'query_user_behavior',
          description: '查询用户行为数据',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL 查询语句' },
              limit: { type: 'number', description: '返回行数限制', default: 100 }
            },
            required: ['sql']
          }
        }]
      },
      id
    });
  }

  // 执行查询
  if (method === 'tools/call' && params.name === 'query_user_behavior') {
    const { sql, limit = 100 } = params.arguments;

    try {
      // 安全检查: 仅允许 SELECT 语句
      if (!sql.trim().toLowerCase().startsWith('select')) {
        return res.json({
          jsonrpc: '2.0',
          error: { message: '仅支持 SELECT 查询' },
          id
        });
      }

      const result = await pool.query(`${sql} LIMIT ${limit}`);

      return res.json({
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(result.rows, null, 2)
          }]
        },
        id
      });
    } catch (error) {
      return res.json({
        jsonrpc: '2.0',
        error: { message: error.message },
        id
      });
    }
  }
});

app.listen(8000, () => {
  console.log('DatabaseMCP Server running on port 8000');
});
```

#### Step 2: 配置 MCP Server

```json
{
  "InternalDatabaseMCP": {
    "type": "http",
    "url": "https://db-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-db-token"
    },
    "prompt": "内部数据库查询工具。可以执行 SQL 查询获取用户行为数据、交易数据等。仅支持 SELECT 查询,自动限制返回 100 行。"
  }
}
```

#### Step 3: 使用

```
用户:"查询最近 7 天的活跃用户数"

AI 自动调用 query_user_behavior 工具:
  → 参数: {
      "sql": "SELECT COUNT(DISTINCT user_id) as active_users FROM user_events WHERE created_at >= NOW() - INTERVAL '7 days'"
    }
  → 获取查询结果
  → 基于结果回答

AI 回复:
"最近 7 天的活跃用户数为 12,458 人。

相比上周:
- 增长了 8.5%(上周 11,487 人)
- 增长主要来自移动端(+12%)
- 桌面端略有下降(-2%)

建议关注移动端用户体验优化。"
```

---

## MCP 工具的可见性

### AI 如何知道 MCP 工具?

**1. 工具列表**

当 AI 开始研究时,会看到所有可用工具:

```
可用工具:
- webSearch (内置): 网络搜索
- interviewChat (内置): 一对一深度访谈
- query_notebook (MCP): 查询 Jupyter Notebook
- query_user_behavior (MCP): 查询用户行为数据
- ...
```

**2. 工具描述**

每个 MCP 工具都有详细描述:

```
query_notebook:
  描述: 查询 Jupyter Notebook 中的数据分析结果
  参数:
    - notebook_path: Notebook 文件路径(必需)
```

**3. MCP Server 提示词**

MCP Server 的 `prompt` 字段会追加到系统提示词:

```
系统提示词:
你是 atypica.AI,一个商业研究助手...

[MCP Server 提示词]
Jupyter 数据分析工具。可以查询团队的 Jupyter Notebook,获取数据分析结果、可视化图表和统计信息。

内部数据库查询工具。可以执行 SQL 查询获取用户行为数据、交易数据等。仅支持 SELECT 查询。
```

**AI 决策流程**:
```
用户:"分析用户留存率"

AI 推理:
1. 需要用户行为数据
2. 查看可用工具:
   - webSearch: 不适合(需要内部数据)
   - query_user_behavior: ✅ 适合(可查询内部数据)
3. 决定使用 query_user_behavior 工具
4. 构建 SQL 查询
5. 执行并分析结果
```

---

## 能力边界

### ✅ MCP 集成能做什么

**1. 数据源集成**
- ✅ Jupyter Notebook
- ✅ 内部数据库(PostgreSQL, MySQL, MongoDB)
- ✅ 内部 API
- ✅ 文件系统
- ✅ 云存储(S3, GCS)

**2. 工具集成**
- ✅ 数据分析工具
- ✅ 可视化工具
- ✅ 机器学习模型
- ✅ 外部 API(Twitter, Reddit, etc.)

**3. 工作流集成**
- ✅ CI/CD 系统
- ✅ 项目管理工具(Jira, Linear)
- ✅ 文档系统(Notion, Confluence)

**4. 安全特性**
- ✅ 团队级隔离(每个团队独立配置)
- ✅ 认证机制(API Key, Header 认证)
- ✅ 数据留在团队内部(通过内部 MCP Server)

---

### ❌ MCP 集成不能做什么

**1. 跨团队访问**
- ❌ 团队 A 无法访问团队 B 的 MCP Server
- ❌ 个人用户无法使用团队 MCP(需要团队 ID)

**2. 实时数据流**
- ❌ 不支持 WebSocket 持续连接
- ✅ 支持 SSE 单向流式输出

**3. 文件上传**
- ❌ MCP 工具无法直接上传文件到 atypica
- ✅ 可以返回文件内容(文本/JSON)

**4. 长时间运行任务**
- ❌ MCP 工具调用有超时限制(通常 2-5 分钟)
- ✅ 可以通过异步任务 + 状态查询解决

---

## 最佳实践

### 1. MCP Server 设计

**推荐架构**:
```
atypica.AI
    ↓
MCP Gateway (认证、路由)
    ↓
    ├→ JupyterMCP (读取 Notebook)
    ├→ DatabaseMCP (查询数据库)
    └→ APIMCP (调用内部 API)
```

**关键原则**:
- **单一职责**: 每个 MCP Server 专注一类功能
- **安全第一**: 严格认证,限制查询权限
- **性能优化**: 缓存常用数据,限制返回数据量
- **错误处理**: 友好的错误信息,帮助 AI 理解问题

---

### 2. 工具命名

**推荐命名**:
```
✅ 好的命名:
- query_user_behavior (动词+对象)
- get_notebook_results (清晰的动作)
- search_internal_docs (明确的范围)

❌ 不好的命名:
- tool1 (无意义)
- data (太宽泛)
- query (不明确查询什么)
```

---

### 3. 工具描述

**推荐格式**:
```
✅ 好的描述:
"查询 Jupyter Notebook 中的数据分析结果。可以提取代码输出、可视化图表和统计信息。支持的 Notebook 路径格式: notebooks/xxx.ipynb"

❌ 不好的描述:
"查询 Notebook" (太简短,AI 不知道如何使用)
```

**包含要素**:
1. 功能说明(做什么)
2. 适用场景(什么时候用)
3. 参数说明(如何使用)
4. 限制说明(不能做什么)

---

### 4. 安全最佳实践

**1. 最小权限原则**
```python
# ✅ 仅允许 SELECT 查询
if not sql.lower().startswith('select'):
    raise PermissionError("仅支持 SELECT 查询")

# ✅ 限制返回行数
result = await pool.query(f"{sql} LIMIT 100")

# ❌ 不检查权限
result = await pool.query(sql)  # 危险!可能执行 DELETE/UPDATE
```

**2. 认证分层**
```
Layer 1: API Key 认证(验证调用方身份)
Layer 2: 工具级权限(验证工具访问权限)
Layer 3: 数据级权限(验证数据访问权限)
```

**3. 敏感数据脱敏**
```python
# ✅ 脱敏敏感字段
result = [{
    'user_id': row['user_id'],
    'email': mask_email(row['email']),  # 脱敏
    'behavior': row['behavior']
} for row in result.rows]

# ❌ 直接返回敏感数据
return result.rows  # 可能包含邮箱、电话等敏感信息
```

---

## 故障排查

### 问题 1: MCP 工具无法调用

**现象**: AI 没有调用团队配置的 MCP 工具

**排查步骤**:
1. **检查团队 ID**: 确保用户属于配置了 MCP 的团队
2. **检查配置**: 在团队管理后台查看 MCP 配置是否正确
3. **检查认证**: 测试 MCP Server 端点是否可访问
4. **检查工具描述**: 确保工具描述清晰,AI 能理解使用场景

**验证命令**:
```bash
# 测试 MCP Server 连接
curl -X POST https://your-server.com/mcp \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

---

### 问题 2: 认证失败

**现象**: `{"error": "Unauthorized"}`

**排查步骤**:
1. **API Key 格式**: 确保格式为 `atypica_xxxxx`
2. **Header 格式**: 确保为 `Authorization: Bearer atypica_xxxxx`
3. **API Key 有效性**: 检查 API Key 是否过期或被删除
4. **内部认证**: 检查 `x-internal-secret` 和 `x-user-id` 是否正确

---

### 问题 3: 工具调用超时

**现象**: MCP 工具调用超时,AI 显示错误

**解决方案**:
1. **优化查询**: 减少数据处理时间
2. **增加超时**: 配置更长的超时时间
3. **异步处理**: 对于长时间任务,改为异步模式
4. **缓存结果**: 缓存常用查询结果

---

## 未来展望

### 近期改进(3 个月内)

1. **可视化配置界面**
   - 图形化配置 MCP Server
   - 测试工具调用
   - 查看调用日志

2. **更多内置 MCP Server**
   - NotionMCP: 访问 Notion 文档
   - SlackMCP: 查询 Slack 消息
   - GitHubMCP: 查询代码和 Issue

3. **MCP 市场**
   - 公开 MCP Server 模板
   - 一键部署常用 MCP Server

### 中期改进(6 个月内)

1. **MCP Server SDK**
   - Python SDK
   - Node.js SDK
   - Go SDK

2. **高级认证**
   - OAuth 2.0 支持
   - SAML 支持
   - 细粒度权限控制

3. **监控和日志**
   - MCP 调用日志
   - 性能监控
   - 错误追踪

---

## 总结

**MCP 集成能力**是 atypica.AI 的核心差异化功能,让团队可以:

### 核心价值

1. **打破数据孤岛**: AI 直接访问内部数据,无需手动导出
2. **工具无限扩展**: 集成团队现有工具,无需重复开发
3. **安全可控**: 数据留在团队内部,通过 MCP Server 安全访问
4. **标准协议**: 遵循 MCP 标准,未来可接入更多工具

### 适用场景

✅ **适合**:
- 数据驱动的研究(需要访问内部数据)
- 工作流自动化(调用内部工具)
- 团队定制研究流程
- 隐私敏感场景(数据不出团队)

❌ **不适合**:
- 个人用户(无团队 ID)
- 纯公开数据研究(无需 MCP)
- 简单查询(内置工具已足够)

### 与其他功能的关系

```
Plan Mode(意图澄清层)
    ↓
参考研究 + 文件附件(背景加载)
    ↓
MCP 集成(工具扩展) ← 你在这里
    ↓
Study Agent / Fast Insight Agent(执行层)
    ↓
Memory System(持久化记忆)
```

**功能协同**:
- **Plan Mode**: 判断是否需要调用 MCP 工具
- **文件附件**: 上传外部文件,MCP 访问内部数据,互补
- **Memory System**: 记住 MCP 工具的使用偏好

---

**相关文档**:
- [参考研究 + 文件附件](./reference-attachments.md) - 了解如何上传外部资料
- [Fast Insight Agent](./fast-insight-agent.md) - 了解快速洞察研究
- [Memory System 机制](./memory-system.md) - 了解持久化记忆
- [MCP 官方文档](https://spec.modelcontextprotocol.io/) - 了解 MCP 标准协议
