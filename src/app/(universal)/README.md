# Universal Agent

通用 AI Agent 系统，支持 Skill 扩展和文件操作能力。

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
4. Agent 通过 `readFile` 或 `bash` 命令加载 Skill 内容
5. Agent 按照 Skill 指令执行任务

### 2. 文件操作（In-Memory Sandbox）

基于 `bash-tool` 和 `just-bash`，提供内存沙箱环境。

**可用工具**：
- `bash` - 执行 bash 命令（ls, cat, grep, find 等）
- `readFile` - 读取文件内容
- `writeFile` - 创建/修改文件（仅内存，请求结束后销毁）
- `exportFolder` - 导出文件夹为 zip 供下载

**安全限制**：
- ✅ 支持：bash 命令（ls, cat, grep, find, head, tail 等）
- ❌ 禁止：脚本执行（python, node, php 等）
- ❌ 禁止：压缩命令（tar -z, gzip, bzip2 等）- 会触发原生模块加载失败

### 3. 文件导出和下载

Agent 可以将内存沙箱中的文件打包下载。

**完整流程**：

```
┌─────────────────────────────────────────────────────────┐
│ 1. Agent 在内存沙箱中创建/修改文件                        │
│    writeFile({ path: "project/app.js", content: "..." })│
│    writeFile({ path: "project/README.md", content: "..."})│
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Agent 调用导出工具                                    │
│    exportFolder({ folderPath: "project" })              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 系统打包并保存到磁盘                                  │
│    内存 sandbox → JSZip 打包 →                          │
│    .next/cache/sandbox/user/{id}/exports/{token}.zip   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 前端显示下载按钮                                      │
│    用户点击 → GET /api/download/{token}                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 浏览器下载 zip 文件                                   │
│    下载后服务端自动删除临时文件                          │
└─────────────────────────────────────────────────────────┘
```

**关键点**：
- 内存沙箱在请求结束后销毁，但 zip 文件已持久化到磁盘
- 下载是新的 HTTP 请求，从磁盘读取 zip 文件
- 一次性下载（下载后自动删除）
- 需要用户认证，只能下载自己的文件

## 使用示例

### 示例 1：使用 Skill 生成内容

```
用户：用 ai-product-growth skill 帮我分析一下产品增长策略

Agent：
  bash: ls -la  # 查看可用 skills
  readFile({ path: "ai-product-growth/SKILL.md" })  # 加载 skill
  [按照 Skill 指令执行分析...]
```

### 示例 2：生成代码项目并下载

```
用户：帮我创建一个 React 项目模板

Agent：
  writeFile({ path: "my-react-app/package.json", content: "..." })
  writeFile({ path: "my-react-app/src/App.jsx", content: "..." })
  writeFile({ path: "my-react-app/src/index.js", content: "..." })
  writeFile({ path: "my-react-app/README.md", content: "..." })
  bash: ls -la my-react-app  # 验证文件
  exportFolder({ folderPath: "my-react-app" })

→ 用户看到下载按钮，点击下载 zip 文件
```

## 技术架构

### 核心组件

- **Agent 配置**：`src/app/(universal)/agents/universalAgentConfig.ts`
- **工具集**：`src/app/(universal)/tools/`
  - `bash`, `readFile`, `writeFile` - bash-tool 提供
  - `exportFolder` - 自定义导出工具
  - `listSkills` - Skill 列表查询
- **API**：`src/app/(universal)/api/`
  - `chat/universal/route.ts` - 聊天流式响应
  - `download/[token]/route.ts` - 文件下载
- **UI**：`src/app/(universal)/universal/[token]/`

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
A: 是的。just-bash 会自动 fallback 到纯 JavaScript 实现。当前配置下，用户通过 exportFolder（使用 jszip）下载文件，不需要原生压缩模块。

**Q: 遇到 "Cannot find module '@mongodb-js/zstd'" 错误？**
A: 这是因为在 sandbox 中使用了压缩命令（如 `tar -czf`）。解决方案：
  - **推荐**：使用 `exportFolder` 工具代替 tar 命令
  - 如果必须支持 tar，在 Dockerfile 中取消注释复制原生模块的代码

**Q: sandbox 中不能使用 tar 命令吗？**
A: 可以使用 `tar -cf`（无压缩），但不能使用 `tar -czf` 或 `tar -cjf`（带压缩）。压缩功能需要原生模块，当前配置下不可用。建议使用 exportFolder 工具。

## 文件存储路径

```
.next/cache/sandbox/
└── user/
    └── {userId}/
        ├── skills/              # Skill 文件
        │   ├── skill-name-1/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   └── skill-name-2/
        └── exports/             # 导出文件（临时）
            └── {token}.zip
```

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
