# MCP Integration - Connect AI to Your Data and Tools

## Core Value

MCP (Model Context Protocol) is an open standard introduced by Anthropic that enables AI to securely access enterprise tools and data sources. atypica.AI's native MCP support helps teams:

1. **Break Data Silos**: AI directly accesses internal data without manual exports
2. **Unlimited Extensions**: Connect existing team tools without rebuilding
3. **Secure and Controlled**: Data stays within team infrastructure with secure access

**Simple Explanation**:
- **Traditional AI**: Limited to public web data and preset functions
- **MCP Integration**: AI can invoke your team's proprietary tools (databases, internal systems, custom APIs)

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

## How MCP Works

### Simple Understanding

**Model Context Protocol (MCP)** is an open standard introduced by Anthropic that defines how AI securely accesses external tools and data.

**Connection Flow**:
```
Your Question → atypica.AI → Team's MCP Server → Internal Data/Tools
```

**Core Features**:
- **Unified Standard**: Follows MCP open standard, compatible with ecosystem
- **Secure Isolation**: Each team independently configured, data segregated
- **Flexible Integration**: Supports various data sources and tools

---

## Team-Level Configuration

### Flexible Setup, Secure Access

**Each team can configure their own MCP servers in the admin dashboard** without requiring technical implementation:

**Configuration Content**:
- **Server Address**: Access URL for the team's MCP server
- **Authentication**: API Key or access token
- **Function Description**: Tell AI what this tool can do

**Example Scenarios**:
- Configure Jupyter analysis tool to let AI access team's data analysis results
- Configure internal database query tool to let AI directly query user behavior data
- Configure internal API tool to let AI invoke team's proprietary services

**Key Features**:
- **Instant Activation**: Takes effect immediately across all research sessions
- **Team Isolation**: Each team's configuration is independent, data securely segregated
- **Flexible Updates**: Add, modify, or remove MCP server configurations anytime

---

## Built-in Deep Research Tool

atypica.AI provides a built-in **DeepResearch** MCP server for teams to quickly experience MCP integration capabilities.

### Core Capabilities

**DeepResearch** is a deep research tool that executes complex multi-step research tasks:

**Key Features**:
- **Deep Analysis**: Integrated with Grok model for in-depth insights
- **Real-time Feedback**: Live progress updates during research
- **Secure Access**: Supports API Key authentication

**Usage**:
Teams can configure DeepResearch as an MCP tool for AI to invoke automatically during research

---

## Use Case Examples

### Scenario 1: Access Jupyter Data Analysis

**Business Need**: Team's data analysts store research results in Jupyter Notebooks, and want AI to directly reference these analysis outputs.

**Solution**: Deploy a Jupyter MCP server to let AI directly read analysis results, charts, and conclusions from Notebooks.

**Configuration**: Configure Jupyter MCP server address and access credentials in team admin dashboard.

**Real Usage**:

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

### Scenario 2: Query Internal Database

**Business Need**: Business teams need quick access to user behavior data, transaction data, and other internal data for analysis.

**Solution**: Deploy a database MCP server to let AI securely query internal databases (read-only queries supported).

**Configuration**: Configure database MCP server address and access credentials in team admin dashboard.

**Real Usage**:

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

## How AI Intelligently Invokes Tools

### Automatic Recognition and Invocation

When AI starts research, it automatically recognizes all available tools:

**Tool Recognition**:
- AI can see all MCP tools configured by the team
- Each tool has clear functional descriptions
- AI automatically selects appropriate tools based on user needs

**Intelligent Decision**:
```
User: "Analyze user retention rate"

AI Automatic Reasoning:
1. Identifies need for internal user data
2. Discovers team has database query tool configured
3. Automatically invokes that tool to fetch data
4. Provides analysis based on real data
```

**Key Advantages**:
- No need for users to manually specify tools
- AI automatically selects the most suitable data source
- Team members simply ask questions naturally

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

## Configuration Recommendations

### Tool Naming Guidelines

**Clear and Meaningful Names**:
- ✅ Good naming: `query_user_behavior` (query user behavior), `get_notebook_results` (get notebook results)
- ❌ Bad naming: `tool1` (meaningless), `data` (too vague)

### Function Description Essentials

**Clear Function Descriptions**:
- Explain the tool's purpose and use cases
- Describe what data can be retrieved
- Note any limitations (e.g., read-only, data volume limits)

### Security Recommendations

**Permission Control**:
- Grant only necessary data access permissions
- Implement sensitive data masking
- Configure access tokens and rotate regularly

**Data Security**:
- Data transmitted through encrypted channels
- Team data mutually isolated
- Support audit log tracking

---

## Frequently Asked Questions

### Q: Why aren't MCP tools being invoked?

**Check Points**:
- Confirm user belongs to a team with MCP configured
- Verify configuration is saved correctly
- Ensure tool description is clear for AI to understand use case

### Q: How to ensure data security?

**Security Mechanisms**:
- All access requires authentication
- Data transmission encrypted
- Team-level isolation, data segregated
- Support read-only permission configuration

### Q: What types of tools can be integrated?

**Supported Types**:
- Data analysis tools (Jupyter, data visualization)
- Database queries (PostgreSQL, MySQL, MongoDB)
- Internal APIs and services
- Documentation systems (Notion, Confluence)
- Project management tools (Jira, Linear)

---

## Future Plans

### Coming Soon

1. **Visual Configuration Interface** - Graphical configuration and testing of MCP tools
2. **More Built-in Tools** - MCP integration for common tools like Notion, Slack, GitHub
3. **MCP Template Marketplace** - One-click deployment of common MCP server configurations

### Long-term Vision

1. **Developer Toolkits** - Multi-language SDKs to simplify MCP server development
2. **Advanced Permission Management** - More granular access control
3. **Usage Analytics** - MCP tool invocation statistics and performance monitoring

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
