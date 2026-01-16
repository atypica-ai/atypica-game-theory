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
2. 系统解压到 `.next/cache/skills/user-{id}/skill-name/`
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
│    .next/cache/skills/user-{id}/.exports/{token}.zip   │
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

```typescript
// next.config.ts
config.externals.push("just-bash");         // 内存沙箱
config.externals.push("@mongodb-js/zstd");  // 原生压缩模块
config.externals.push("node-liblzma");      // 原生压缩模块
config.externals.push("sql.js");            // SQLite
```

这些模块不被 webpack 打包，运行时从 node_modules 加载。

## 文件存储路径

```
.next/cache/skills/
├── user-{id}/
│   ├── skill-name-1/          # Skill 文件
│   │   ├── SKILL.md
│   │   └── references/
│   ├── skill-name-2/
│   └── .exports/              # 导出文件（临时）
│       └── {token}.zip
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
