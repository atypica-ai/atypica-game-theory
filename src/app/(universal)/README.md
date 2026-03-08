# Universal Agent

通用 AI Agent 系统，支持 Skill 扩展、持久化文件操作和 Sub-agent 研究任务。

## Sandbox 文件系统

Agent 工作在虚拟文件系统中，通过 `ReadWriteFs` 双向直通磁盘：

```
/workspace/                    # 工作区根目录（可读写，持久化，ReadWriteFs 双向同步）
  sessions/
    {leadChatToken}/           # Lead agent 的 session 工作目录
    {subChatToken1}/           # Sub-agent 1 的 session 工作目录
    {subChatToken2}/           # Sub-agent 2 的 session 工作目录
  reports/                     # generateReport 产物（系统管理）
    {reportToken}/onePageHtml.html
/skills/                       # 专家技能库（只读，OverlayFs，独立挂载）
```

每个 agent（lead 或 sub）都有自己的 session 目录，`bash-tool` 的 cwd 和 destination 指向各自的 session 目录。agent 仍可通过绝对路径 `/workspace/...` 访问工作区内的其他文件。

**虚拟路径 → 磁盘路径映射**：
```
虚拟:  /workspace/sessions/{token}/output.md
磁盘:  .next/cache/sandbox/user/{userId}/workspace/sessions/{token}/output.md

虚拟:  /skills/my-skill/SKILL.md
磁盘:  .next/cache/sandbox/user/{userId}/skills/my-skill/SKILL.md
```

**持久化机制**：
- `ReadWriteFs` 双向直通磁盘，读写即时生效，无需手动同步
- Skills 从 S3 缓存到磁盘，通过 `OverlayFs` 只读挂载
- `bash-tool` 每次命令前 `cd` 到 session 目录（由 `destination` 参数控制）

**可用工具**：
- `bash` - 执行 bash 命令（ls, cat, grep, find 等）
- `readFile` - 读取文件内容
- `writeFile` - 创建/修改文件
- ⚠️ 不支持脚本执行（python, node, php 等）
- ⚠️ 不支持压缩命令（tar -z, gzip, bzip2 等）

## Sub-agent

Lead agent 通过 `createSubAgent` 工具创建 sub-agent 执行研究任务。

**三种执行模式**（`mode` 参数）：
- **study** — 完整研究流程：搜索人设 → 访谈/讨论 → 报告
- **flexible** — 所有工具可用，无强制流程，按 taskRequirement 自行决策
- **panel** — 人设已预选，跳过搜索/构建，直接讨论/访谈 → 报告

**Sub-agent 具备的能力**：
- 完整的 study agent 工具集（searchPersonas, interviewChat, discussionChat, generateReport 等）
- bash/readFile/writeFile（通过独立 sandbox 注入，session 目录隔离）
- 移除了 requestInteraction（自主执行，不与用户交互）

**通信机制**：
- tool output 返回 `subAgentChatToken` 和 session 目录路径
- lead agent 可用 bash 访问 sub-agent 的 session 目录读取产物
- TODO: sub-agent 完成通知机制尚未实现

## System Prompt 组成

Lead agent 和 sub-agent 的 system prompt 都由多段拼接而成：

**Lead agent**（`agent.ts`）：
```
baseSystemPrompt     // 角色定义 + skills + 对话指南
sandboxPrompt        // 文件系统说明（目录结构、CWD、命令限制）— src/sandbox/prompt.ts
memoryUsagePrompt    // 记忆使用指南
```

**Sub-agent**（`createSubAgent/index.ts`）：
```
config.systemPrompt  // study 基础提示词
modePrompt           // 模式执行要求（study/flexible/panel）— createSubAgent/prompt.ts
sandboxPrompt        // 文件系统说明（同上，src/sandbox/prompt.ts）
```

`sandboxSystemPrompt()` 接受 `sessionDir` 和 `hasSkills` 参数，根据上下文动态生成，lead/sub-agent 共用同一份。

## 核心组件

- **Sandbox**：`src/sandbox/`
  - `paths.ts` - 虚拟路径常量（`SANDBOX_CWD`, `SANDBOX_SESSIONS_DIR`, `SANDBOX_SKILLS_DIR`）+ 磁盘路径函数
  - `index.ts` - `createAgentSandbox({ sessionDir? })` 创建 MountableFs + bash-tool，支持 session 目录
  - `prompt.ts` - `sandboxSystemPrompt()` 文件系统提示词（lead/sub-agent 共用）
  - `skill.ts` - Skill S3 缓存管理
- **System Prompt**：`src/app/(universal)/prompt/index.ts`
- **Agent**：`src/app/(universal)/agent.ts`
- **工具集**：`src/app/(universal)/tools/`
  - `createSubAgent/` - Sub-agent 创建和管理
    - `index.ts` - 工具实现（sandbox 注入、mode 切换）
    - `prompt.ts` - 三种模式的执行提示词
    - `types.ts` - input/output schema
- **API**：`src/app/(universal)/api/`
  - `chat/universal/route.ts` - 聊天流式响应
  - `export/route.ts` - 文件/文件夹下载
- **UI**：`src/app/(universal)/universal/[token]/`
  - `task-vm.ts` - Task View Model，从 messages 提取 tool call 数据转换为 UI 纯数据
    - `extractTasksFromMessages` → 任务列表（从 createSubAgent tool calls 提取）
    - `extractSubAgentToolPartsFromMessages` → 任务详情时间线（从 study tool calls 提取）
- **Server Actions**：`src/app/(universal)/actions.ts`
  - `listWorkspaceFiles` - 直接扫描磁盘目录

## Webpack 配置

```typescript
// next.config.ts
webpack: (config, { isServer, webpack }) => {
  if (isServer) {
    config.externals.push("@mongodb-js/zstd");
    config.externals.push("node-liblzma");
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

## 磁盘存储路径

```
.next/cache/sandbox/
└── user/
    └── {userId}/
        ├── skills/              # Skill 文件（从 S3 缓存，只读）
        │   └── skill-name/
        │       ├── SKILL.md
        │       └── references/
        └── workspace/           # 用户工作区（持久化，可读写）
            ├── sessions/        # 每个 agent session 的工作目录
            │   ├── {token1}/
            │   └── {token2}/
            └── reports/         # generateReport 产物
```
