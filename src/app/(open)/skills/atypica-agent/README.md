# atypica Universal Agent Skill

AI-powered Universal Agent through MCP protocol. Provides bash tools, skills, panel-based research, discussions, interviews, and automated content generation.

## Features

- 🛠️ Bash tools and custom skills execution
- 👥 Panel management with persona selection
- 🗣️ Focus group discussions and interviews
- 📊 Automated report and podcast generation
- 🔍 Semantic persona search
- 🌐 Team MCP tool integration

## Prerequisites

### Required

- **atypica.ai account** - Sign up at https://atypica.ai
- **API Key** - Get from https://atypica.ai/account/api-keys (format: `atypica_xxx`)
- **MCP-compatible AI assistant** OR **bash/curl** for direct API access

### Usage & Billing

- Research operations consume atypica.ai token credits
- Token usage tracked per user account
- Check usage at https://atypica.ai/account/tokens

## Installation

### Option 1: MCP Integration

Requires MCP-compatible AI assistant (e.g., Claude Desktop, Cline).

**Configuration**:
```json
{
  "mcpServers": {
    "atypica-universal": {
      "transport": "http",
      "url": "https://atypica.ai/mcp/universal",
      "headers": {
        "Authorization": "Bearer atypica_xxx"
      }
    }
  }
}
```

See [SKILL.md](SKILL.md) for detailed setup instructions.

### Option 2: Bash Script (No MCP required)

```bash
export ATYPICA_TOKEN="atypica_xxx"
scripts/mcp-call.sh atypica_universal_create '{"content":"Your research query"}'
```

## Documentation

- **[SKILL.md](SKILL.md)** - Detailed usage guide for AI assistants
- **[scripts/mcp-call.sh](scripts/mcp-call.sh)** - Bash fallback tool

## Available Tools

**Session**: `atypica_universal_create`, `atypica_universal_send_message`, `atypica_universal_get_messages`, `atypica_universal_list`

**Artifacts**: `atypica_universal_get_report`, `atypica_universal_get_podcast`

**Personas**: `atypica_universal_search_personas`, `atypica_universal_get_persona`

## Quick Links

- Website: https://atypica.ai
- Documentation: https://atypica.ai/docs/mcp
- Issues: https://github.com/bmrlab/atypica-llm-app/issues

---

**Auto-synced from [atypica-llm-app](https://github.com/bmrlab/atypica-llm-app)**
