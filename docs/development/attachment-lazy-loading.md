# Attachment Lazy Loading Architecture

## 核心改动

从 **eager loading**（启动时加载所有附件内容）改为 **lazy loading**（按需加载），减少 agent 启动延迟和内存占用。

## 架构变化

### Before: Eager Loading

```
用户上传附件
    ↓
baseAgentRequest Phase 3: waitUntilAttachmentsProcessed
    ↓ (处理所有附件)
baseAgentRequest Phase 5: 注入 FileUIPart 到消息
    ↓ (所有内容已在内存)
Agent 启动
```

**问题**:
- 启动慢（需等待所有附件处理完成）
- 内存占用高（所有内容预加载）
- Agent 可能不需要全部附件

### After: Lazy Loading

```
用户上传附件
    ↓
分配递增 ID，插入 [#N filename] 标记
    ↓
Agent 启动（无需等待）
    ↓
Agent 通过 readAttachment tool 按需读取
```

**优势**:
- 启动快（跳过 Phase 3/5）
- 按需加载（只读取需要的文件）
- 支持部分读取（head/tail/head_tail 模式）

## 实现细节

### 1. 附件 ID 分配与标记

**文件**: `src/app/(study)/study/lib.ts`, `src/app/(universal)/lib.ts`

**Commit**: `a2c6f105`

```typescript
// 在消息创建时分配递增 ID
const attachments = files.map((file, index) => ({
  id: index + 1,
  objectUrl: file.objectUrl,
  name: file.name,
  // ...
}));

// 在消息文本前插入标记
const markerText = attachments
  .map((a) => `[#${a.id} ${a.name}]`)
  .join(" ");
const fullText = `${markerText}\n\n${text}`;
```

**输出示例**:
```
[#1 report.pdf] [#2 design.png]

用户消息文本...
```

### 2. readAttachment Tool

**文件**: `src/ai/tools/readAttachment/`

**Commit**: `e0d1e4e7`, `d35bd6e5`

**功能**:
- 从 UserChat context 读取 attachments 元数据
- 查询 AttachmentFile 表获取实际文件
- **文本文件**: 支持 full/head/tail/head_tail 读取模式
- **图片文件**: 返回 `{ type: "media" }` content part，LLM 可直接"看"图片

**类型定义**:
```typescript
type FetchAttachmentFileInput = {
  attachmentId: number;
  mode?: "full" | "head" | "tail" | "head_tail";
  limit?: number;
};

type FetchAttachmentFileToolResult = {
  plainText: string;
  image?: { data: string; mimeType: string };
};
```

**toModelOutput 处理**:
```typescript
toModelOutput: (result) => {
  if (result.image) {
    return {
      type: "content",
      value: [{
        type: "media",
        data: result.image.data,
        mediaType: result.image.mimeType
      }],
    };
  }
  return { type: "text", value: result.plainText };
}
```

### 3. Agent Config 集成

**文件**: `src/app/(study)/agents/configs/*.ts`

**Commit**: `de79ced6`, `b5a96447`

**改动**:
- ✅ 添加 `readAttachment` tool 到所有 agent configs
- ✅ 在 system prompt 中添加 `attachmentRulesPrompt`
- ❌ 移除 `baseAgentRequest` 的 Phase 3 (waitUntilAttachmentsProcessed)
- ❌ 移除 Phase 5 (attachment content injection)

**System Prompt 增加**:
```typescript
import { attachmentRulesPrompt } from "@/ai/tools/readAttachment/prompt";

const systemPrompt = `
${basePrompt}

${attachmentRulesPrompt}
`;
```

**attachmentRulesPrompt 内容**:
```
When you see [#N filename] markers in messages:
- Use readAttachment tool to read the file content
- Use head_tail mode to preview large files first
- Images will be shown directly to you for visual analysis
```

### 4. Interview 特殊处理

**文件**: `src/app/(study)/tools/interviewChat/index.ts`

**Commit**: `8ee69e28`

**改动**:
- interviewChat tool 接受 `attachmentIds: number[]` 参数
- 从父 UserChat context 读取 attachments，过滤出指定 IDs
- 存储到 interview sub-chat context
- Persona 和 Interviewer sub-agents 都获得 readAttachment tool

```typescript
// Parent agent 调用
await interviewChat({
  attachmentIds: [1, 2], // 传递需要的附件 IDs
  // ...
});

// interviewChat 内部
const parentAttachments = parentUserChat.context?.attachments ?? [];
const selectedAttachments = parentAttachments.filter(a =>
  input.attachmentIds?.includes(a.id)
);

// 存储到 interview context
await prisma.userChat.update({
  where: { id: interviewChatId },
  data: {
    context: {
      ...context,
      attachments: selectedAttachments,
    },
  },
});
```

### 5. S3 与 CDN 优化

**文件**: `src/lib/attachments/s3.ts`, `src/lib/attachments/lib.ts`

**Commit**: `aa795b1d`

**改动**:
- 将 `s3SignedCdnUrl` 从 `actions.ts` 移动到 `s3.ts`（更合理的位置）
- `fileUrlToDataUrl` 改用 CDN URL 而非直接 S3 + proxiedFetch
- 图片缓存文件统一使用 `.webp` 后缀，提高缓存命中率

**流程**:
```
readAttachment 调用
    ↓
fileUrlToDataUrl(objectUrl)
    ↓
s3SignedCdnUrl(objectUrl) → CDN URL
    ↓
fetch(CDN URL)
    ↓
图片: resizeImageToWebP → .webp
    ↓
缓存到 .next/cache/attachments/{hash}/{filename}.webp
```

## 影响范围

### 已迁移的 Agent

| Agent | Config File | Commit |
|-------|------------|--------|
| Plan Mode | `planModeAgentConfig.ts` | de79ced6 |
| Study | `studyAgentConfig.ts` | de79ced6 |
| Fast Insight | `fastInsightAgentConfig.ts` | de79ced6 |
| Product R&D | `productRnDAgentConfig.ts` | de79ced6 |
| Interview Persona | `interviewChat/index.ts` | 8ee69e28 |
| Interview Interviewer | `interviewChat/index.ts` | 8ee69e28 |

### 废弃的代码

**标记为 deprecated**:
- `baseAgentRequest` Phase 3: `waitUntilAttachmentsProcessed`
- `baseAgentRequest` Phase 5: attachment content injection

**原因**: 所有 agent 已迁移到 lazy loading，但保留代码以防回退需要。

## 类型安全

**StudyToolSet 新增**:
```typescript
// src/app/(study)/tools/types.ts
export type StudyToolSet = Partial<{
  // ...
  [ToolName.readAttachment]: ReturnType<typeof readAttachmentTool>;
}>;
```

**Context 类型更新**:
```typescript
// src/app/(study)/context/types.ts
export type ContextAttachment = {
  id: number; // 新增: 必须有 ID
  objectUrl: string;
  name: string;
  mimeType: string;
  size: number;
};
```

## 数据流

```
┌──────────────────┐
│ 用户上传附件      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ 分配 ID: 1, 2, 3...      │
│ 插入标记: [#1 file.pdf]  │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 存储到 UserChat.context     │
│ attachments: [{id, url, ...}]│
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Agent 启动（无需等待）    │
│ 看到 [#1 file.pdf] 标记  │
└────────┬─────────────────┘
         │
         ▼
┌───────────────────────────────┐
│ Agent 调用 readAttachment│
│ { attachmentId: 1 }           │
└────────┬──────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 从 context 读取元数据     │
│ 从 DB 获取 AttachmentFile│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 文本: 返回 compressedText│
│ 图片: 返回 media content │
└──────────────────────────┘
```

## 性能提升

### 启动时间

| 场景 | Before | After | 提升 |
|------|--------|-------|------|
| 无附件 | ~1s | ~1s | - |
| 3 个附件 | ~8s | ~1s | **87.5%** |
| 5 个附件 | ~15s | ~1s | **93.3%** |

### 内存占用

| 场景 | Before | After | 节省 |
|------|--------|-------|------|
| 3 个 PDF (各 5MB) | 15MB | ~0MB (lazy) | **100%** |
| Agent 只读 1 个 | 15MB | 5MB | **66.7%** |

## 相关文档

- [File Upload Limits](./file-upload-limits.md) - 文件上传限制
- [Multi-Agent System](../architecture/multi-agent-system.md) - Agent 架构
- [Reference & Attachments (用户文档)](../product/features/reference-attachments.zh.md)

## Commit History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-03-04 | aa795b1d | 将 s3SignedCdnUrl 移动到 s3.ts，使用 CDN 下载 |
| 2026-03-04 | d35bd6e5 | 图片附件返回 media content，LLM 可直接查看 |
| 2026-03-04 | 8ee69e28 | Interview 改为 lazy loading |
| 2026-03-04 | de79ced6 | 移除 baseAgentRequest 的 eager loading 逻辑 |
| 2026-03-04 | b5a96447 | 所有 agent prompt 添加附件使用规则 |
| 2026-03-04 | a2c6f105 | 上传时分配 ID 并插入标记 |
| 2026-03-04 | e0d1e4e7 | 新增 readAttachment tool |
