# Universal Agent + Skills Tutorial: Build Your 10-Person Team from Scratch

Imagine this:

You tell your AI Agent: "Write me technical documentation." It instantly loads `technical-writer.skill` and transforms into a tech writer.

Next moment: "Analyze our competitors' ad strategies." It swaps in `marketing-analyst.skill` and starts crawling data.

Even better: Need an expert in a niche domain—say, "SQL performance tuning"—but can't find one? **Let the Agent write a skill for itself**.

This isn't sci-fi. And it's **ridiculously simple** to build.

---

This guide shows you how to build a **Universal Agent**:

- ✅ **Load any skill** - Drop in a `.skill` file, Agent instantly gains new capabilities
- ✅ **Self-authoring skills** - Agent can create specialized skill packages for itself
- ✅ **Persistent work** - Files survive across conversations—code from morning, iterate in afternoon
- ✅ **Zero infrastructure** - No Docker, no K8s. Just a Next.js project.

Think of it as assembling a 10-person founding team: each skill is a specialist, the Agent is the PM, you're the CEO.

## Architecture

```
User uploads skill packages → S3 storage
                                ↓
Request starts → Load skills + workspace → In-memory sandbox
                                ↓
Agent reads skills, creates files, uses tools
                                ↓
Request ends → Save workspace changes → Disk
                                ↓
Next conversation → Files persisted → Agent continues work
```

**Key components:**
- `bash-tool` - In-memory filesystem with bash, readFile, writeFile
- Skills in `sandbox/user/{id}/skills/` (read-only, from S3)
- Workspace in `sandbox/user/{id}/workspace/` (read-write, persisted)
- AI SDK handles streaming, tool calls, token tracking

## Core Implementation

### 1. Skill Structure

Each skill is a `.skill` file (zip format) with a simple structure:

```
my-skill/
├── SKILL.md          # Instructions and expertise
└── references/       # Optional: supporting docs
    └── examples.md
```

**Example SKILL.md:**

```markdown
---
name: technical-writer
description: Creates technical documentation, API guides, and tutorials.
---

# Technical Writer Skill

You are an expert technical writer who creates clear, concise documentation.

## Expertise
- API documentation with examples
- Architecture decision records (ADRs)
- User guides and tutorials
- Code comments and inline docs

## Guidelines
- Start with why, then what, then how
- Include practical examples
- Use active voice
- Keep it DRY—link instead of repeating

## Activation
Activate when user asks to:
- "Write documentation for..."
- "Create an API guide..."
- "Document this codebase..."
```

Upload flow: User uploads zip → Store in S3 → Reference in database → Agent loads on demand.

### 2. Core Route Handler

**File: `app/api/chat/universal/route.ts`**

```typescript
import { streamText } from "ai";
import { createBashTool } from "bash-tool";
import { loadAllSkillsToMemory } from "@/lib/skill/loadToMemory";
import { loadUserWorkspace, saveUserWorkspace } from "@/lib/skill/workspace";

export async function POST(req: Request) {
  const { userId, userChatId } = await authenticate(req);

  // Load skills from S3/disk
  const skills = await prisma.agentSkill.findMany({ where: { userId } });
  const skillFiles = await loadAllSkillsToMemory(skills);

  // Load persisted workspace
  const workspaceFiles = await loadUserWorkspace(userId);

  // Prefix skills for isolation
  const skillFilesWithPrefix = Object.fromEntries(
    Object.entries(skillFiles).map(([path, content]) => [`skills/${path}`, content])
  );

  // Create sandbox
  const { tools: bashTools, sandbox } = await createBashTool({
    files: {
      ...workspaceFiles,         // User's work (root directory)
      ...skillFilesWithPrefix,   // Skills (skills/ subdirectory)
    },
  });

  // Merge with other tools
  const tools = {
    ...baseTools,              // webSearch, reasoningThinking, etc.
    bash: bashTools.bash,
    readFile: bashTools.readFile,
    writeFile: bashTools.writeFile,
    exportFolder: exportFolderTool({ sandbox, userId }),
  };

  // Stream with persistence
  const result = streamText({
    model: llm("claude-sonnet-4-5"),
    system: buildSystemPrompt({ skills, locale }),
    messages: await loadMessages(userChatId, { tools }),
    tools,

    onStepFinish: async (step) => {
      await saveStepToDB(step);
      await trackTokens(step);
    },

    onFinish: async () => {
      // Persist workspace changes
      await saveUserWorkspace(userId, sandbox);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

**Key points:**
- Load both skills and workspace at start
- Skills isolated under `skills/` prefix (read-only)
- Workspace in root (read-write, persisted)
- `onFinish` saves all changes back to disk

### 3. Workspace Persistence

**File: `lib/skill/workspace.ts`**

```typescript
import type { Sandbox } from "bash-tool";

export async function loadUserWorkspace(userId: number): Promise<Record<string, string>> {
  const workspacePath = getWorkspacePath(userId); // .next/cache/sandbox/user/{id}/workspace
  const files: Record<string, string> = {};

  await loadDirectoryRecursively(workspacePath, "", files);
  return files;
}

export async function saveUserWorkspace(userId: number, sandbox: Sandbox): Promise<void> {
  const workspacePath = getWorkspacePath(userId);

  // Get all files except skills/
  const findResult = await sandbox.executeCommand(
    `find . -type f ! -path "./skills/*" 2>/dev/null || echo ""`
  );

  const filePaths = findResult.stdout.split("\n").filter(Boolean);

  // Clear workspace and save fresh state
  await fs.rm(workspacePath, { recursive: true, force: true });
  await fs.mkdir(workspacePath, { recursive: true });

  for (const filePath of filePaths) {
    const content = await sandbox.readFile(filePath);
    const fullPath = path.join(workspacePath, filePath.replace(/^\.\//, ""));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}
```

**How it works:**
1. **Load**: Read all files from disk into memory
2. **Agent works**: Creates/modifies files in sandbox
3. **Save**: Extract non-skill files, write back to disk
4. **Next request**: Files reappear in sandbox

### 4. System Prompt

**File: `app/prompt/index.ts`**

```typescript
export async function buildUniversalSystemPrompt({ userId, locale, skills }) {
  const skillsXml = skills.map(s => `
<skill>
  <name>${s.name}</name>
  <description>${s.description}</description>
  <location>skills/${s.name}/SKILL.md</location>
</skill>
  `).join('\n');

  return `You are a Universal Agent with access to specialized skills.

## Available Skills

${skillsXml}

## Workspace Structure

\`\`\`
sandbox/
├── skills/                 # Read-only skills from S3
│   ├── technical-writer/
│   └── market-researcher/
└── my-project/            # Your persistent workspace
    └── README.md
\`\`\`

## How to Use Skills

1. **Load a skill**: \`cat skills/technical-writer/SKILL.md\`
2. **Embody the role**: Follow the skill's instructions completely
3. **Use skill references**: \`cat skills/technical-writer/references/examples.md\`

## File Operations

- **Create**: \`writeFile({ path: "project/index.js", content: "..." })\`
- **Read**: \`cat project/index.js\` or \`readFile({ path: "project/index.js" })\`
- **Export**: \`exportFolder({ folderPath: "project" })\` for user download

All files in root directory persist across conversations.

## Guidelines

- Load skills when user requests specialized work
- Follow skill instructions precisely—they're your expertise
- Create files in root directory (not under skills/)
- Use bash commands for exploration (ls, find, grep, etc.)`;
}
```

**Critical design:**
- Skills as XML (Claude-native format)
- Clear workspace vs. skills separation
- Emphasize persistence behavior
- Simple, actionable instructions

## Real-World Usage

### Example 1: Technical Documentation

```
User: "Write API documentation for our payment system"

Agent:
  1. cat skills/technical-writer/SKILL.md
  2. [Loads skill, embodies technical writer role]
  3. writeFile({ path: "docs/api-reference.md", content: "..." })
  4. writeFile({ path: "docs/examples.md", content: "..." })
  5. exportFolder({ folderPath: "docs" })

→ User downloads complete documentation package
```

### Example 2: Cross-Session Work

```
User: "Research AI coding tools market, create report"

Agent:
  1. cat skills/market-researcher/SKILL.md
  2. webSearch({ query: "AI coding tools 2025 market analysis" })
  3. [Analyzes results, synthesizes insights]
  4. writeFile({ path: "research/market-analysis.md", content: "..." })
  5. [User stops conversation, goes to meeting]

Later:
User: "Add competitive landscape section"

Agent:
  1. cat research/market-analysis.md  # File still exists!
  2. [Continues work on existing file]
  3. writeFile({ path: "research/market-analysis.md", content: "..." })
  4. exportFolder({ folderPath: "research" })
```

### Example 3: Agent Creates Own Skill

```
User: "Create a skill for SQL query optimization"

Agent:
  1. mkdir -p sql-optimizer
  2. writeFile({ path: "sql-optimizer/SKILL.md", content: "..." })
  3. writeFile({ path: "sql-optimizer/references/patterns.md", content: "..." })
  4. exportFolder({ folderPath: "sql-optimizer" })

User: Downloads, uploads as .skill file
→ Now available in skills/ directory for future use
```

## Key Design Decisions

### 1. Why bash-tool?

**Alternatives considered:**
- Direct filesystem access → Security risk
- Code interpreter (Python) → Too narrow
- Full VM (@vercel/sandbox) → Overkill for file operations

**Why bash-tool wins:**
- In-memory, isolated sandbox
- Familiar bash commands (ls, cat, grep, find)
- No script execution (security)
- Perfect for file manipulation + exploration

### 2. Why Separate Skills and Workspace?

```
✅ Current: skills/ (read-only) + workspace/ (read-write)
❌ Alternative: Everything in root directory

Problem: Agent might accidentally overwrite skills
Solution: Clear separation, explicit in prompts
```

### 3. Why Full Workspace Sync (Not Delta)?

```typescript
// ❌ Delta approach: Track and save only changed files
await saveChangedFiles(changedFiles);

// ✅ Full sync: Save complete workspace state
await saveEntireWorkspace(allFiles);
```

**Reasoning:**
- Simpler implementation (no change tracking needed)
- Handles deletions naturally (file missing → deleted)
- Performance: Workspace typically < 100 files, sync is fast
- Reliability: Avoids sync drift issues

### 4. Why Skills as Claude XML?

```xml
<skill>
  <name>technical-writer</name>
  <description>Creates technical documentation</description>
  <location>skills/technical-writer/SKILL.md</location>
</skill>
```

Claude models are trained on XML structures for tools and artifacts. This format:
- Native to Claude's training
- Easy to parse
- Extensible (add metadata without breaking)
- Familiar to Claude for skill discovery

## Deployment Considerations

### Docker Configuration

**Challenge:** bash-tool uses native modules (@mongodb-js/zstd, node-liblzma) for compression.

**Solution:** Don't copy native modules—they're optional.

```dockerfile
# Dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Note: Native compression modules NOT copied
# - exportFolder uses jszip (pure JS)
# - just-bash has JS fallback for compression
# If you need tar -z in sandbox, uncomment:
# COPY --from=deps /app/node_modules/.pnpm/@mongodb-js+zstd@*/node_modules/@mongodb-js ./node_modules/@mongodb-js
```

**next.config.ts:**

```typescript
webpack: (config, { isServer, webpack }) => {
  if (isServer) {
    // Only externalize native binaries
    config.externals.push("@mongodb-js/zstd", "node-liblzma");

    // Ignore browser-only worker.js
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/worker\.js$/,
        contextRegExp: /just-bash/,
      })
    );
  }
  return config;
}
```

### Storage Management

```typescript
// Periodic cleanup of old exports
export async function cleanupOldExports() {
  const exportsDir = path.join(process.cwd(), ".next/cache/sandbox");
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

  for (const userId of await fs.readdir(path.join(exportsDir, "user"))) {
    const exportsPath = getExportsPath(Number(userId));
    for (const file of await fs.readdir(exportsPath)) {
      const stat = await fs.stat(path.join(exportsPath, file));
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(path.join(exportsPath, file));
      }
    }
  }
}
```

## Performance Benchmarks

**Tested on M1 Mac, 50 skills, 200 workspace files:**

| Operation | Time | Notes |
|-----------|------|-------|
| Load skills + workspace | 120ms | Parallel I/O |
| Create 10 files | 5ms | In-memory |
| Save workspace | 80ms | Write to disk |
| Export folder (50 files) | 150ms | Zip creation |

**Optimization tips:**
1. Cache skill files across requests (same user, same skills)
2. Use streaming for large file exports
3. Compress workspace with zstd if > 1MB

## What's Next?

**Extend the system:**

1. **Version control**: Git integration for workspace
2. **Skill marketplace**: Share skills between users
3. **Collaborative workspaces**: Multiple agents, one workspace
4. **Skill composition**: Agent loads multiple skills simultaneously
5. **Skill inheritance**: Base skills + specialized variants

**The power:** Every user becomes a founder with a full engineering team. Each skill is a specialist. The Agent orchestrates. The workspace persists. The possibilities compound.

## Code References

- **Main route**: `src/app/(universal)/api/chat/universal/route.ts`
- **Workspace persistence**: `src/lib/skill/workspace.ts`
- **Skill loading**: `src/lib/skill/loadToMemory.ts`
- **Export tool**: `src/app/(universal)/tools/exportFolder.ts`
- **System prompt**: `src/app/(universal)/prompt/index.ts`
- **README**: `src/app/(universal)/README.md`

---

*Built with Next.js 15, Vercel AI SDK, bash-tool, and Claude 4.5 Sonnet.*
