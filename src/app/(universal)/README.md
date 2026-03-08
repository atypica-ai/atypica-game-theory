# Universal Agent

通用 AI Agent 系统，支持 Skill 扩展和持久化文件操作。

## Sandbox 文件系统

Agent 工作在虚拟文件系统中，通过 `ReadWriteFs` 双向直通磁盘：

```
/workspace/   # 当前目录（可读写，持久化，ReadWriteFs 双向同步）
/skills/      # 专家技能库（只读，OverlayFs）
```

**虚拟路径 → 磁盘路径映射**：
```
虚拟:  /workspace/reports/xxx/onePageHtml.html
磁盘:  .next/cache/sandbox/user/{userId}/workspace/reports/xxx/onePageHtml.html

虚拟:  /skills/my-skill/SKILL.md
磁盘:  .next/cache/sandbox/user/{userId}/skills/my-skill/SKILL.md
```

**持久化机制**：
- `ReadWriteFs` 双向直通磁盘，读写即时生效，无需手动同步
- Skills 从 S3 缓存到磁盘，通过 `OverlayFs` 只读挂载
- `bash-tool` 每次命令前 `cd /workspace`（由 `destination` 参数控制）

**可用工具**：
- `bash` - 执行 bash 命令（ls, cat, grep, find 等）
- `readFile` - 读取文件内容
- `writeFile` - 创建/修改文件
- ⚠️ 不支持脚本执行（python, node, php 等）

## 核心组件

- **Sandbox**：`src/sandbox/`
  - `paths.ts` - 虚拟路径常量 + 磁盘路径函数
  - `index.ts` - `createAgentSandbox()` 创建 MountableFs + bash-tool
  - `skill.ts` - Skill S3 缓存管理
- **System Prompt**：`src/app/(universal)/prompt/index.ts`
- **Agent**：`src/app/(universal)/agent.ts`
- **工具集**：`src/app/(universal)/tools/`
- **API**：`src/app/(universal)/api/`
  - `chat/universal/route.ts` - 聊天流式响应
  - `export/route.ts` - 文件/文件夹下载
- **UI**：`src/app/(universal)/universal/[token]/`
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
            ├── reports/         # generateReport 产物
            └── my-project/
```
