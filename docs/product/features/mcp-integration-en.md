# MCP Integration - Connect AI to Your Tools and Data

## Core Philosophy

MCP (Model Context Protocol) is an open standard that enables AI to securely access external tools and data sources. atypica.AI's MCP integration empowers teams to:

1. **Integrate Custom Tools**: Connect your internal tools directly into research workflows
2. **Access Data Sources**: Query Jupyter Notebooks, internal databases, and APIs seamlessly
3. **Extend AI Capabilities**: Add team-specific research capabilities to AI

**Analogy**:
- **Traditional AI**: Limited to preset tools (webSearch, interviewChat, etc.)
- **MCP Integration**: AI can invoke any tool your team provides (internal analytics tools, proprietary APIs, etc.)

---

## Overview: With vs Without MCP Integration

| **Scenario** | **Without MCP Integration** | **With MCP Integration** |
|---------|----------------|----------------|
| **Data Sources** | Public web data only | Internal databases, Jupyter Notebooks, private APIs |
| **Tool Extension** | atypica built-in tools only | Custom team tools |
| **Research Depth** | Surface-level (public info) | Deep-dive (internal + public data) |
| **Team Customization** | Generic research workflows | Team-specific research workflows |
| **Data Security** | Data leaves team boundaries | Data stays within team infrastructure (via internal MCP server) |

### Real-World Comparison

**Scenario**: Analyze user behavior data

**Without MCP Integration** (30 minutes):
```
User: "Analyze our product's user behavior data"

AI: Cannot access internal data
   → User must manually export data
   → User copies/pastes data into chat (limited by character length)
   → AI analyzes incomplete data

Result: Superficial analysis, incomplete data
```

**With MCP Integration** (5 minutes):
```
User: "Analyze our product's user behavior data"

AI: Invokes team's JupyterDataMCP
   → Directly accesses Jupyter Notebook analysis results
   → Automatically retrieves latest data and visualizations
   → Performs deep analysis on complete dataset

Result: In-depth analysis, complete data, fully automated
```

**Efficiency Gains**:
- **Time**: 30 minutes → 5 minutes (83% reduction)
- **Data Completeness**: Incomplete → Complete (100%)
- **Automation**: Manual → Automated

---

## What is MCP?

### Official Definition

**Model Context Protocol (MCP)** is an open standard introduced by Anthropic that defines how AI applications securely connect to external tools and data sources.

**Core Capabilities**:
1. **Tools**: Functions AI can invoke (e.g., data queries, API calls)
2. **Resources**: Assets AI can access (e.g., files, database records)
3. **Prompts**: Pre-defined prompt templates

### How It Works

```
atypica.AI Agent
     ↓
MCP Client (built into atypica)
     ↓
MCP Server (deployed by team)
     ↓
Team Data/Tools (Jupyter, databases, APIs, etc.)
```

**Key Features**:
- **Standard Protocol**: All MCP Servers follow a unified interface
- **Security Isolation**: Each team's MCP Server is independently configured
- **Flexible Transport**: Supports HTTP, SSE, and other transport methods

---

## atypica.AI MCP Integration Architecture

### 1. Team-Level Configuration

**Each team can configure their own MCP servers**:

**Configuration Format**:
```json
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://your-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-token"
    },
    "prompt": "Jupyter data analysis tool that accesses all team Notebooks"
  },
  "InternalDatabaseMCP": {
    "type": "sse",
    "url": "https://db-server.com/mcp",
    "headers": {
      "X-API-Key": "your-api-key"
    },
    "prompt": "Internal database query tool supporting user behavior and transaction data queries"
  }
}
```

**Configuration Location**:
- **Database**: `TeamConfig` table, `name = "mcp"`
- **Management UI**: Team admin dashboard → MCP Configuration

---

### 2. Client Management (MCPClientManager)

**MCPClientManager** manages team MCP clients:

**Features**:
```typescript
// src/ai/tools/mcp/client.ts
export class MCPClientManager {
  // 1. Lazy loading: Load team config only on first access
  async getClientsForTeam(teamId: number): Promise<MCPClient[]>

  // 2. Caching: Cache in memory after loading to avoid repeated loads
  private teamClientsCache: Map<number, MCPClient[]>

  // 3. Hot reload: Automatically reload when config updates
  async reloadTeamClients(teamId: number): Promise<void>

  // 4. Metadata: Get tools, resources, and prompts from all MCP Servers
  async getAllMetadataForTeam(teamId: number): Promise<MCPMetadata[]>
}
```

**Usage**:
```typescript
// Automatically load team's MCP tools in baseAgentRequest
const manager = getMcpClientManager();
const mcpClients = teamId
  ? await manager.getClientsForTeam(teamId)
  : [];

// Load all MCP tools
const mcpToolsArray = await Promise.all(
  mcpClients.map((client) => client.getTools())
);

// Merge into Agent toolset
const allTools = {
  ...config.tools,           // atypica built-in tools
  ...Object.assign({}, ...mcpToolsArray),  // Team MCP tools
};
```

---

### 3. Universal Integration (baseAgentRequest)

**MCP tools are automatically available in all Agents**:

**File Location**: `src/app/(study)/agents/baseAgentRequest.ts`

**Integration Flow**:
```typescript
// Phase 4: Universal MCP and Team System Prompt
// =============================================================================

// 1. Load team's MCP clients
const manager = getMcpClientManager();
const mcpClients = baseContext.teamId
  ? await manager.getClientsForTeam(baseContext.teamId)
  : [];

logger.info({
  msg: "Loaded MCP clients",
  mcpClients: mcpClients.length,
  teamId: baseContext.teamId,
});

// 2. Load all MCP tools
const mcpToolsArray = await Promise.all(
  mcpClients.map((client) => client.getTools())
);

// 3. Load all MCP prompt contents
const mcpPromptContents = await Promise.all(
  mcpClients.map((client) => client.getPromptContents())
);

// 4. Merge MCP prompts into system prompt
let finalSystemPrompt = config.systemPrompt;
if (mcpPromptContents.length > 0) {
  const mcpPromptsSection = mcpPromptContents
    .filter((content) => content.length > 0)
    .join("\n\n---\n\n");

  if (mcpPromptsSection) {
    finalSystemPrompt = `${config.systemPrompt}\n\n---\n\n${mcpPromptsSection}`;
  }
}

// 5. Merge MCP tools into Agent toolset
const allTools = {
  ...config.tools,
  ...Object.assign({}, ...mcpToolsArray),
};

// 6. Execute Agent (MCP tools automatically available)
const response = streamText({
  model: llm(config.model),
  system: finalSystemPrompt,
  tools: allTools,  // Includes built-in tools + MCP tools
  messages: cachedCoreMessages,
  // ...
});
```

**Key Features**:
- **Auto-Loading**: No manual configuration needed, baseAgentRequest automatically loads team's MCP tools
- **Universal Availability**: All Agent types (Study, Fast Insight, Product R&D) support MCP tools
- **Prompt Enhancement**: MCP Server prompts automatically append to system prompt
- **Tool Merging**: MCP tools and built-in tools seamlessly merge

---

## Built-in MCP Server: DeepResearch

atypica.AI provides a built-in MCP Server - **DeepResearch** - for teams to quickly experience MCP integration.

### Features

**DeepResearch** is a deep research tool integrated with the Grok model:

**Endpoint**: `/mcp/deepResearch`

**Tools**:
- `atypica_deep_research`: Execute deep research tasks

**Features**:
1. **Streaming Output**: Supports SSE (Server-Sent Events) real-time streaming
2. **Progress Notifications**: Real-time research progress feedback
3. **Dual Authentication**: API Key authentication + internal service authentication

---

### Authentication Methods

#### 1. API Key Authentication (Recommended)

**Use Case**: External teams calling DeepResearch MCP

**Get API Key**:
1. Log into atypica.AI
2. Navigate to Account Settings → API Keys
3. Generate personal API Key (format: `atypica_xxxxx`)

**Request Example**:
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
        "query": "Analyze AI applications in business research",
        "expert": "auto"
      }
    },
    "id": 1
  }'
```

---

#### 2. Internal Service Authentication

**Use Case**: Internal atypica service-to-service calls

**Authentication Method**:
- Header 1: `x-internal-secret` = Environment variable `INTERNAL_API_SECRET`
- Header 2: `x-user-id` = User ID (integer)

**Request Example**:
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
        "query": "Analyze market trends"
      }
    },
    "id": 1
  }'
```

---

### Streaming Output (SSE)

**Enable Streaming**:
- Header: `Accept: text/event-stream`
- Response Format: SSE (Server-Sent Events)

**SSE Event Types**:
```
event: message
data: {"progress": 0.1, "message": "Starting research..."}

event: message
data: {"progress": 0.5, "message": "Searching for relevant information..."}

event: message
data: {"progress": 1.0, "message": "Research complete", "result": "..."}

event: done
data: {}
```

**Disable Streaming**:
- URL Parameter: `?sse=0`
- Response Format: JSON (complete result returned at once)

---

## How Teams Integrate Custom MCP

### Scenario 1: Accessing Jupyter Notebooks

**Need**: Team has extensive data analysis results stored in Jupyter Notebooks, and wants AI to directly access these results.

**Solution**:

#### Step 1: Deploy JupyterDataMCP Server

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
    # Authentication check
    if not authorization or not authorization.startswith("Bearer "):
        return {"error": "Unauthorized"}

    token = authorization.replace("Bearer ", "")
    if token != "your-secret-token":
        return {"error": "Invalid token"}

    # Handle tool calls
    if request.method == "tools/call":
        tool_name = request.params["name"]
        arguments = request.params["arguments"]

        if tool_name == "query_notebook":
            notebook_path = arguments["notebook_path"]
            # Read Jupyter Notebook
            result = read_jupyter_notebook(notebook_path)
            return {
                "jsonrpc": "2.0",
                "result": {"content": [{"type": "text", "text": result}]},
                "id": request.id
            }

    # List available tools
    if request.method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "result": {
                "tools": [{
                    "name": "query_notebook",
                    "description": "Query data analysis results from Jupyter Notebooks",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "notebook_path": {
                                "type": "string",
                                "description": "Notebook file path"
                            }
                        },
                        "required": ["notebook_path"]
                    }
                }]
            },
            "id": request.id
        }

def read_jupyter_notebook(path: str) -> str:
    # Read and parse Jupyter Notebook
    import nbformat
    with open(path, 'r') as f:
        nb = nbformat.read(f, as_version=4)

    # Extract all outputs
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

#### Step 2: Configure MCP Server

In atypica.AI team admin dashboard:

```json
{
  "JupyterDataMCP": {
    "type": "http",
    "url": "https://your-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-secret-token"
    },
    "prompt": "Jupyter data analysis tool. Can query team's Jupyter Notebooks to retrieve analysis results, visualizations, and statistical information."
  }
}
```

#### Step 3: Usage

```
User (on atypica.AI): "Analyze user retention rate, reference notebooks/retention_analysis.ipynb"

AI automatically invokes query_notebook tool:
  → Parameters: {"notebook_path": "notebooks/retention_analysis.ipynb"}
  → Retrieves Notebook analysis results
  → Answers user question based on results

AI Response:
"Based on your retention_analysis.ipynb Notebook, here's the user retention analysis:

- Day 1 retention: 45%
- Day 7 retention: 28%
- Day 30 retention: 15%

Key Findings:
1. Day 1 → Day 7 churn rate reaches 38% (onboarding needs optimization)
2. Paid user retention is 2.3x that of free users
3. Users engaging with core features show 60% higher retention

Recommendations:
1. Optimize onboarding flow
2. Guide users to core features
3. Design paid conversion paths"
```

---

### Scenario 2: Accessing Internal Database

**Need**: Directly query internal PostgreSQL database for user behavior data.

**Solution**:

#### Step 1: Deploy DatabaseMCP Server

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

  // Authentication check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ error: 'Unauthorized' });
  }

  // List tools
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [{
          name: 'query_user_behavior',
          description: 'Query user behavior data',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL query statement' },
              limit: { type: 'number', description: 'Result row limit', default: 100 }
            },
            required: ['sql']
          }
        }]
      },
      id
    });
  }

  // Execute query
  if (method === 'tools/call' && params.name === 'query_user_behavior') {
    const { sql, limit = 100 } = params.arguments;

    try {
      // Safety check: Only allow SELECT statements
      if (!sql.trim().toLowerCase().startsWith('select')) {
        return res.json({
          jsonrpc: '2.0',
          error: { message: 'Only SELECT queries supported' },
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

#### Step 2: Configure MCP Server

```json
{
  "InternalDatabaseMCP": {
    "type": "http",
    "url": "https://db-server.com/mcp",
    "headers": {
      "Authorization": "Bearer your-db-token"
    },
    "prompt": "Internal database query tool. Execute SQL queries to retrieve user behavior data, transaction data, etc. Only SELECT queries supported, automatically limited to 100 rows."
  }
}
```

#### Step 3: Usage

```
User: "Query active users in the last 7 days"

AI automatically invokes query_user_behavior tool:
  → Parameters: {
      "sql": "SELECT COUNT(DISTINCT user_id) as active_users FROM user_events WHERE created_at >= NOW() - INTERVAL '7 days'"
    }
  → Retrieves query results
  → Responds based on results

AI Response:
"Active users in the last 7 days: 12,458.

Compared to last week:
- Increased 8.5% (from 11,487 last week)
- Growth primarily from mobile (+12%)
- Desktop slightly declined (-2%)

Recommend focusing on mobile user experience optimization."
```

---

## MCP Tool Visibility

### How Does AI Know About MCP Tools?

**1. Tool List**

When AI starts research, it sees all available tools:

```
Available Tools:
- webSearch (built-in): Web search
- interviewChat (built-in): One-on-one deep interview
- query_notebook (MCP): Query Jupyter Notebooks
- query_user_behavior (MCP): Query user behavior data
- ...
```

**2. Tool Descriptions**

Each MCP tool has detailed descriptions:

```
query_notebook:
  Description: Query data analysis results from Jupyter Notebooks
  Parameters:
    - notebook_path: Notebook file path (required)
```

**3. MCP Server Prompts**

MCP Server's `prompt` field appends to system prompt:

```
System Prompt:
You are atypica.AI, a business research assistant...

[MCP Server Prompts]
Jupyter data analysis tool. Can query team's Jupyter Notebooks to retrieve analysis results, visualizations, and statistical information.

Internal database query tool. Execute SQL queries to retrieve user behavior data, transaction data, etc. Only SELECT queries supported.
```

**AI Decision Process**:
```
User: "Analyze user retention rate"

AI Reasoning:
1. Need user behavior data
2. Review available tools:
   - webSearch: Not suitable (need internal data)
   - query_user_behavior: ✅ Suitable (can query internal data)
3. Decide to use query_user_behavior tool
4. Construct SQL query
5. Execute and analyze results
```

---

## Capability Boundaries

### ✅ What MCP Integration Can Do

**1. Data Source Integration**
- ✅ Jupyter Notebooks
- ✅ Internal databases (PostgreSQL, MySQL, MongoDB)
- ✅ Internal APIs
- ✅ File systems
- ✅ Cloud storage (S3, GCS)

**2. Tool Integration**
- ✅ Data analysis tools
- ✅ Visualization tools
- ✅ Machine learning models
- ✅ External APIs (Twitter, Reddit, etc.)

**3. Workflow Integration**
- ✅ CI/CD systems
- ✅ Project management tools (Jira, Linear)
- ✅ Documentation systems (Notion, Confluence)

**4. Security Features**
- ✅ Team-level isolation (each team independently configured)
- ✅ Authentication mechanisms (API Key, Header auth)
- ✅ Data stays within team infrastructure (via internal MCP Server)

---

### ❌ What MCP Integration Cannot Do

**1. Cross-Team Access**
- ❌ Team A cannot access Team B's MCP Server
- ❌ Personal users cannot use team MCP (requires team ID)

**2. Real-Time Data Streaming**
- ❌ No WebSocket persistent connections
- ✅ Supports SSE unidirectional streaming output

**3. File Uploads**
- ❌ MCP tools cannot directly upload files to atypica
- ✅ Can return file content (text/JSON)

**4. Long-Running Tasks**
- ❌ MCP tool calls have timeout limits (typically 2-5 minutes)
- ✅ Can solve via async tasks + status polling

---

## Best Practices

### 1. MCP Server Design

**Recommended Architecture**:
```
atypica.AI
    ↓
MCP Gateway (auth, routing)
    ↓
    ├→ JupyterMCP (read Notebooks)
    ├→ DatabaseMCP (query database)
    └→ APIMCP (call internal APIs)
```

**Key Principles**:
- **Single Responsibility**: Each MCP Server focuses on one type of functionality
- **Security First**: Strict authentication, limit query permissions
- **Performance Optimization**: Cache frequently-used data, limit return data size
- **Error Handling**: Friendly error messages to help AI understand issues

---

### 2. Tool Naming

**Recommended Naming**:
```
✅ Good naming:
- query_user_behavior (verb+object)
- get_notebook_results (clear action)
- search_internal_docs (clear scope)

❌ Bad naming:
- tool1 (meaningless)
- data (too vague)
- query (unclear what's being queried)
```

---

### 3. Tool Descriptions

**Recommended Format**:
```
✅ Good description:
"Query data analysis results from Jupyter Notebooks. Can extract code outputs, visualizations, and statistical information. Supported Notebook path format: notebooks/xxx.ipynb"

❌ Bad description:
"Query Notebook" (too brief, AI doesn't know how to use)
```

**Essential Elements**:
1. Functionality (what it does)
2. Use cases (when to use it)
3. Parameter instructions (how to use it)
4. Limitations (what it cannot do)

---

### 4. Security Best Practices

**1. Principle of Least Privilege**
```python
# ✅ Only allow SELECT queries
if not sql.lower().startswith('select'):
    raise PermissionError("Only SELECT queries supported")

# ✅ Limit returned rows
result = await pool.query(f"{sql} LIMIT 100")

# ❌ No permission checks
result = await pool.query(sql)  # Dangerous! Could execute DELETE/UPDATE
```

**2. Layered Authentication**
```
Layer 1: API Key auth (verify caller identity)
Layer 2: Tool-level permissions (verify tool access)
Layer 3: Data-level permissions (verify data access)
```

**3. Sensitive Data Masking**
```python
# ✅ Mask sensitive fields
result = [{
    'user_id': row['user_id'],
    'email': mask_email(row['email']),  # Masked
    'behavior': row['behavior']
} for row in result.rows]

# ❌ Directly return sensitive data
return result.rows  # May contain email, phone, etc.
```

---

## Troubleshooting

### Issue 1: MCP Tools Not Being Invoked

**Symptom**: AI doesn't use team's configured MCP tools

**Troubleshooting Steps**:
1. **Check Team ID**: Ensure user belongs to a team with MCP configured
2. **Check Configuration**: Review MCP config in team admin dashboard
3. **Check Authentication**: Test if MCP Server endpoint is accessible
4. **Check Tool Description**: Ensure tool description is clear and AI understands use case

**Verification Command**:
```bash
# Test MCP Server connection
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

### Issue 2: Authentication Failure

**Symptom**: `{"error": "Unauthorized"}`

**Troubleshooting Steps**:
1. **API Key Format**: Ensure format is `atypica_xxxxx`
2. **Header Format**: Ensure format is `Authorization: Bearer atypica_xxxxx`
3. **API Key Validity**: Check if API Key is expired or deleted
4. **Internal Auth**: Check `x-internal-secret` and `x-user-id` are correct

---

### Issue 3: Tool Call Timeout

**Symptom**: MCP tool call times out, AI shows error

**Solutions**:
1. **Optimize Queries**: Reduce data processing time
2. **Increase Timeout**: Configure longer timeout
3. **Async Processing**: Switch to async mode for long-running tasks
4. **Cache Results**: Cache frequently-used query results

---

## Future Roadmap

### Near-Term Improvements (within 3 months)

1. **Visual Configuration Interface**
   - Graphical MCP Server configuration
   - Test tool invocations
   - View call logs

2. **More Built-in MCP Servers**
   - NotionMCP: Access Notion documents
   - SlackMCP: Query Slack messages
   - GitHubMCP: Query code and issues

3. **MCP Marketplace**
   - Public MCP Server templates
   - One-click deployment of common MCP Servers

### Mid-Term Improvements (within 6 months)

1. **MCP Server SDKs**
   - Python SDK
   - Node.js SDK
   - Go SDK

2. **Advanced Authentication**
   - OAuth 2.0 support
   - SAML support
   - Fine-grained permission control

3. **Monitoring and Logging**
   - MCP call logs
   - Performance monitoring
   - Error tracking

---

## Summary

**MCP Integration** is atypica.AI's core differentiator, empowering teams to:

### Core Value

1. **Break Data Silos**: AI directly accesses internal data without manual exports
2. **Unlimited Tool Extension**: Integrate existing team tools without rebuilding
3. **Secure and Controlled**: Data stays within team infrastructure via secure MCP Server access
4. **Standard Protocol**: Follows MCP standard for future compatibility with more tools

### Suitable Use Cases

✅ **Suitable for**:
- Data-driven research (requires internal data access)
- Workflow automation (invoking internal tools)
- Team-customized research processes
- Privacy-sensitive scenarios (data stays within team)

❌ **Not suitable for**:
- Individual users (no team ID)
- Pure public data research (MCP not needed)
- Simple queries (built-in tools sufficient)

### Relationship with Other Features

```
Plan Mode (Intent Clarification Layer)
    ↓
Reference Research + File Attachments (Context Loading)
    ↓
MCP Integration (Tool Extension) ← You are here
    ↓
Study Agent / Fast Insight Agent (Execution Layer)
    ↓
Memory System (Persistent Memory)
```

**Feature Synergy**:
- **Plan Mode**: Determines whether to invoke MCP tools
- **File Attachments**: Upload external files; MCP accesses internal data (complementary)
- **Memory System**: Remembers MCP tool usage preferences

---

**Related Documentation**:
- [Reference Research + File Attachments](./reference-attachments.md) - Learn how to upload external materials
- [Fast Insight Agent](./fast-insight-agent.md) - Learn about rapid insight research
- [Memory System](./memory-system.md) - Learn about persistent memory
- [MCP Official Documentation](https://spec.modelcontextprotocol.io/) - Learn about MCP standard protocol
