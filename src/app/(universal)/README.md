# Universal Agent

通用 AI Agent 系统，支持 Skill 扩展和持久化文件操作。

## 核心特性

### 1. Skill 系统

用户可以上传 `.skill` 文件包，Agent 会根据 Skill 定义执行专业任务。

**Skill 结构**：
```
my-skill/
├── SKILL.md          # Skill 定义和指令
└── references/       # 参考资料（可选）
    └── docs.md
```

**使用流程**：
1. 用户上传 `.skill` 文件（zip 格式）
2. 系统解压到 `.next/cache/sandbox/user/{id}/skills/{skillName}/`
3. Agent 通过 `listSkills` 工具查看可用 skills
4. Agent 使用 `readFile` 或 `bash` 命令加载 Skill 内容
5. Agent 按照 Skill 指令执行任务

### 2. Sandbox 文件系统

Agent 工作在一个持久化的虚拟文件系统中：

```
/home/agent/
├── workspace/    # 用户工作区（可读写，持久化）
│   ├── my-project/
│   └── my-skill/
└── skills/       # Skill 库（只读）
    ├── expert-a/
    └── expert-b/
```

**可用工具**：
- `bash` - 执行 bash 命令（ls, cat, grep, find, pwd, cd 等）
- `readFile` - 读取文件内容
- `writeFile` - 创建/修改文件（**只能在 workspace/ 下**）

**持久化机制**：
- 请求开始：从磁盘加载 workspace/ 文件到 sandbox
- Agent 工作：所有操作在 sandbox 内存中进行
- 每个 step 完成：自动同步所有改动到磁盘（实时持久化）
- 请求结束：最终同步确保所有文件已保存
- workspace/ 文件跨会话持久化，skills/ 每次从源重新加载

**安全限制**：
- ✅ 支持：bash 命令（ls, cat, grep, find, head, tail, pwd, cd 等）
- ❌ 禁止：脚本执行（python, node, php 等）
- ❌ 禁止：压缩命令（tar -z, gzip, bzip2 等）

### 3. 文件面板和下载

用户通过文件面板浏览和下载 workspace 中的文件。

**使用流程**：

```
┌─────────────────────────────────────────────────────────┐
│ 1. Agent 创建/修改文件                                   │
│    writeFile({ path: "workspace/project/app.js", ... }) │
│    writeFile({ path: "workspace/project/README.md", ...})│
│    → 每个 step 完成后自动同步到磁盘                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 用户打开文件面板                                      │
│    点击右上角文件夹图标 → 查看所有文件                   │
│    文件树结构展示，支持展开/折叠                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 用户点击下载按钮                                      │
│    文件 → GET /api/export?filePath=workspace/app.js     │
│    文件夹 → GET /api/export?folderPath=workspace/project│
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 服务端处理下载请求                                    │
│    单个文件 → 直接返回文件（原始格式）                   │
│    文件夹 → JSZip 实时打包 → 返回 zip                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 浏览器下载文件                                        │
│    无临时文件，不需要清理                               │
└─────────────────────────────────────────────────────────┘
```

**关键特性**：
- Agent 不需要主动触发导出，只管创建文件
- 文件自动实时同步到磁盘（每个 step 完成后）
- 文件面板显示完整的文件树结构
- 支持下载单个文件（原始格式）或文件夹（zip 打包）
- 按需打包，无临时文件，无缓存问题

## 使用示例

### 示例 1：使用 Skill 生成内容

```
用户：用 ai-product-growth skill 帮我分析一下产品增长策略

Agent：
  bash: ls -la skills/  # 查看可用 skills
  readFile({ path: "skills/ai-product-growth/SKILL.md" })  # 加载 skill
  [按照 Skill 指令执行分析...]
```

### 示例 2：生成代码项目并下载

```
用户：帮我创建一个 React 项目模板

Agent：
  writeFile({ path: "workspace/my-react-app/package.json", content: "..." })
  writeFile({ path: "workspace/my-react-app/src/App.jsx", content: "..." })
  writeFile({ path: "workspace/my-react-app/src/index.js", content: "..." })
  writeFile({ path: "workspace/my-react-app/README.md", content: "..." })
  bash: ls -la workspace/my-react-app  # 验证文件

  已创建 React 项目，文件已保存到 workspace。

用户：打开文件面板 → 看到 my-react-app 文件夹 → 点击下载按钮
→ 下载 my-react-app.zip
```

### 示例 3：跨会话工作

```
第一次对话：
用户：创建一个 TODO 应用
Agent：writeFile({ path: "workspace/todo-app/index.html", ... })
       writeFile({ path: "workspace/todo-app/app.js", ... })

第二次对话（新会话）：
用户：给 TODO 应用加个暗黑模式
Agent：bash: ls -la workspace/  # 文件还在！
       readFile({ path: "workspace/todo-app/app.js" })
       writeFile({ path: "workspace/todo-app/app.js", ... })  # 修改现有文件
```

## 技术架构

### 核心组件

- **System Prompt**：`src/app/(universal)/prompt/index.ts`
- **工具集**：`src/app/(universal)/tools/`
  - `bash`, `readFile`, `writeFile` - bash-tool 提供
  - `listSkills` - Skill 列表查询
- **API**：`src/app/(universal)/api/`
  - `chat/universal/route.ts` - 聊天流式响应（含自动同步）
  - `export/route.ts` - 文件/文件夹下载（支持单文件和 zip）
- **UI**：`src/app/(universal)/universal/[token]/`
  - `UniversalChatPageClient.tsx` - 聊天主界面
  - `components/WorkspaceFilesPanel.tsx` - 文件面板
- **Workspace**：`src/lib/skill/workspace.ts`
  - `loadUserWorkspace` - 加载持久化文件
  - `saveUserWorkspace` - 同步文件到磁盘（每个 step 自动调用）
- **Server Actions**：`src/app/(universal)/actions.ts`
  - `listWorkspaceFiles` - 获取文件列表

### 依赖

- `bash-tool` - 提供 bash、readFile、writeFile 工具
- `just-bash` - 内存沙箱实现（SQLite + 原生压缩）
- `jszip` - zip 文件打包

### Webpack 配置

**重要**：bash-tool 和 just-bash 的配置比较复杂，因为涉及原生模块打包问题。

```typescript
// next.config.ts
webpack: (config, { isServer, webpack }) => {
  if (isServer) {
    // 只 externalize 原生二进制模块（C++ 编译的 .node 文件）
    config.externals.push("@mongodb-js/zstd");
    config.externals.push("node-liblzma");

    // 忽略 just-bash 的 worker.js（浏览器用的，Node.js 不需要）
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

**工作原理**：
- ✅ **bash-tool 和 just-bash** 的 JavaScript 代码被 webpack 完全打包到 `.next/standalone`
- ✅ **原生二进制模块** (@mongodb-js/zstd, node-liblzma) 被标记为 external（可选，有 JS fallback）
- ✅ **worker.js** 被忽略（仅浏览器需要，Node.js 环境不需要）

**为什么这样配置**：
1. `just-bash` 包含动态 require 和原生模块引用，需要用 IgnorePlugin 处理
2. 原生 .node 文件（C++ 模块）webpack 无法处理，标记为 external
3. worker.js 是 Web Worker，在 Node.js 环境中不存在，必须忽略
4. **不需要 `outputFileTracingIncludes`** - 所有 JS 代码已打包，原生模块可选

## Docker 部署

### 关键配置

Docker 部署时，standalone 模式不会自动包含 externalized 的原生模块，需要特殊处理。

#### Dockerfile 配置

```dockerfile
# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 原生压缩模块是 optional dependencies
# just-bash 可以在没有它们的情况下工作（性能略低）
# 如果需要，从 pnpm store 复制：
# COPY --from=deps /app/node_modules/.pnpm/@mongodb-js+zstd@*/node_modules/@mongodb-js ./node_modules/@mongodb-js
# COPY --from=deps /app/node_modules/.pnpm/node-liblzma@*/node_modules/node-liblzma ./node_modules/node-liblzma
```

**说明**：
- bash-tool 和 just-bash 的代码已经打包在 `.next/standalone` 中
- 原生压缩模块 (`@mongodb-js/zstd`, `node-liblzma`) 是可选依赖
- **当前配置不复制原生模块**，因为：
  - exportFolder 使用 jszip（纯 JS，无原生依赖）
  - 用户通过 exportFolder 下载文件，不需要在 sandbox 中使用 tar/gzip
  - 避免了 "Cannot find module '@mongodb-js/zstd'" 错误
- 如果需要支持 sandbox 内的压缩命令（tar -z 等），取消注释上面的 COPY 行

### 常见问题

**Q: 为什么不直接复制整个 node_modules？**
A: 会增加镜像大小（几百 MB）。当前方案只需要复制原生模块（几 MB），其他代码都已打包。

**Q: 遇到 "just-bash is not installed" 错误？**
A: 检查 next.config.ts 的 webpack 配置，确保 bash-tool 和 just-bash 没有被 externalize。

**Q: 遇到 "Module not found: Can't resolve './worker.js'" 错误？**
A: 确保添加了 IgnorePlugin 来忽略 worker.js。

**Q: 原生压缩模块真的可选吗？**
A: 是的。just-bash 会自动 fallback 到纯 JavaScript 实现。当前配置下，用户通过文件面板下载（使用 jszip），不需要原生压缩模块。

**Q: 遇到 "Cannot find module '@mongodb-js/zstd'" 错误？**
A: 这是因为在 sandbox 中使用了压缩命令（如 `tar -czf`）。解决方案：
  - **推荐**：不需要在 sandbox 中压缩，文件会自动同步到磁盘，用户通过文件面板下载
  - 如果必须支持 tar，在 Dockerfile 中取消注释复制原生模块的代码

**Q: sandbox 中不能使用 tar 命令吗？**
A: 可以使用 `tar -cf`（无压缩），但不能使用 `tar -czf` 或 `tar -cjf`（带压缩）。压缩功能需要原生模块，当前配置下不可用。Agent 创建的文件会自动同步，用户通过文件面板下载即可。

## 文件存储路径

```
.next/cache/sandbox/
└── user/
    └── {userId}/
        ├── skills/              # Skill 文件（从 S3，相对只读）
        │   ├── skill-name-1/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   └── skill-name-2/
        └── workspace/           # 用户工作区（持久化，可读写）
            ├── test-skill/
            └── my-project/
```

**目录说明**：
- `skills/` - 用户上传的 skill 文件，从 S3 下载，相对只读
- `workspace/` - 用户的工作区，持久化保存，可以创建项目、文件等
- 下载时从磁盘实时打包，无临时文件

## 与其他 Agent 的区别

| 特性 | Universal Agent | Study Agent |
|------|----------------|-------------|
| **定位** | 通用任务执行 | 专业研究分析 |
| **扩展性** | Skill 系统 | 固定工具集 |
| **文件操作** | bash-tool (内存) | 不支持 |
| **导出下载** | ✅ | ❌ |
| **研究工具** | 基础（webSearch） | 完整（interview, report 等） |

## 未来考虑

- **AgentFS**：如果需要跨会话的持久化文件系统、版本控制、审计日志，可以考虑集成 [AgentFS](https://github.com/tursodatabase/agentfs)
- **MCP 集成**：团队可以通过 MCP 协议添加自定义工具
