# 分层记忆架构 - 数据结构设计

## 核心设计原则

### 1. 向后兼容
- 保留现有 `content` 字段
- 新增三个分层字段：`core`, `working`, `episodic`
- 迁移策略：上线后将旧 `content` 复制到 `core`，然后删除 `content`

### 2. 版本控制策略

**版本更新时机**：
- ✅ **更新版本**：合并 Working Memory 到 Core Memory 时
- ❌ **不更新版本**：添加 Working Memory 或 Episodic Memory 时

**理由**：
- Core Memory 是稳定的、经过验证的核心知识
- 版本号应该反映核心知识的演进
- Working Memory 是临时的、待整合的知识
- Episodic Memory 是引用性质，不影响核心知识

---

## Schema 设计

### SageMemoryDocument 新字段

```prisma
model SageMemoryDocument {
  id          Int    @id @default(autoincrement())
  sageId      Int
  sage        Sage   @relation(fields: [sageId], references: [id], onDelete: Cascade)
  version     Int

  // === 旧字段（保留用于兼容）===
  content     String? @db.Text  // 改为 nullable，迁移后删除

  // === 新字段：分层记忆 ===
  core     String? @db.Text  // 核心记忆（Markdown 格式）
  working  Json?   @default("[]")  // 工作记忆（结构化数组）
  episodic Json?   @default("[]")  // 情景记忆（引用列表数组）

  changeNotes String @db.Text
  extra       Json   @default("{}")

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  @@unique([sageId, version])
  @@index([sageId, version(sort: Desc)])
}
```

### SageKnowledgeGap 扩展字段

```prisma
model SageKnowledgeGap {
  id          Int       @id @default(autoincrement())
  sageId      Int
  sage        Sage      @relation(fields: [sageId], references: [id], onDelete: Cascade)
  area        String    @db.VarChar(255)
  description String    @db.Text
  severity    String    @db.VarChar(32)
  impact      String    @db.Text
  source      Json      @default("{}")
  resolvedBy  Json      @default("{}")
  resolvedAt  DateTime? @db.Timestamptz(6)
  extra       Json      @default("{}")  // 新增字段将放在这里

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}
```

#### extra 字段扩展内容：

```typescript
interface SageKnowledgeGapExtra {
  // 智能 Gap 解决判断相关
  resolutionConfidence?: number; // 0-1
  resolutionEvidence?: string[]; // 解决的证据引用
  missingAspects?: string[];     // 部分解决时的缺失方面
}
```

---

## TypeScript 类型定义

### Core Memory (核心记忆)

```typescript
interface CoreMemory {
  content: string;       // Markdown 格式的核心知识文档
  lastUpdated: number;   // 最后更新时间戳
  confidence: number;    // 0-1，整体可信度
}
```

### Working Memory (工作记忆)

```typescript
interface WorkingMemoryItem {
  id: string;            // 唯一标识
  content: string;       // 知识内容（Markdown）
  source: "interview" | "conversation";
  sourceId: string;      // 来源 ID（interviewId 或 userChatToken）
  relatedGapIds?: number[]; // 解决的 Gap IDs
  status: "pending" | "integrated" | "discarded"; // 状态
}

type WorkingMemory = WorkingMemoryItem[];
```

**设计原则：极简**
- 去掉 `addedAt`: 可以从数据库 `updatedAt` 推断
- 去掉 `confidence`: 实际使用中不会用到
- 去掉 `relatedTopics`: 可以从 content 中提取，不需要冗余存储

### Episodic Memory (情景记忆)

```typescript
// 只存 chatId，其他信息可以从 UserChat 表查询
type EpisodicMemoryReference = string;

type EpisodicMemory = EpisodicMemoryReference[];
```

**设计原则：极简**
- 只存 chatId，其他信息（timestamp, topic, keyInsights）都可以从 `UserChat` 表实时查询
- 避免数据冗余

### 完整的 Memory Document Extra

```typescript
interface SageMemoryDocumentExtra {
  source: {
    type: "initial" | "interview" | "manual";
    userChatToken?: string;
  };
  // 不再存储统计信息，需要时实时计算
}
```

**设计原则：极简**
- 去掉所有 `layeredMemory` 统计信息
- 所有统计（pendingCount, integratedCount 等）都可以实时从 `working` 和 `episodic` 数组计算
- 避免数据不一致问题

---

## 数据迁移策略

### Phase 1: Schema 添加新字段（兼容模式）

```typescript
// Migration: add_layered_memory_fields.sql
ALTER TABLE "SageMemoryDocument"
  ADD COLUMN "core" TEXT,
  ADD COLUMN "working" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN "episodic" JSONB DEFAULT '[]'::jsonb;

-- 暂时保留 content 字段
```

### Phase 2: 代码适配（双写模式）

```typescript
// 读取时优先使用新字段
function getMemoryContent(doc: SageMemoryDocument): {
  core: string;
  working: WorkingMemoryItem[];
  episodic: EpisodicMemoryReference[];
} {
  // 如果有新字段，使用新字段
  if (doc.core !== null) {
    return {
      core: doc.core,
      working: doc.working as WorkingMemoryItem[],
      episodic: doc.episodic as EpisodicMemoryReference[],
    };
  }

  // 否则兼容旧数据
  return {
    core: doc.content || "",
    working: [],
    episodic: [],
  };
}

// 写入时双写（上线初期）
async function saveMemoryDocument({
  sageId,
  coreMemory,
  workingMemory,
  episodicMemory,
  ...
}: {
  sageId: number;
  coreMemory: string;
  workingMemory: WorkingMemoryItem[];
  episodicMemory: EpisodicMemoryReference[];
}) {
  await prisma.sageMemoryDocument.create({
    data: {
      sageId,
      version: newVersion,
      // 双写：同时写入旧字段和新字段
      content: coreMemory,  // 兼容旧版本
      core: coreMemory,
      working: workingMemory,
      episodic: episodicMemory,
      // ...
    },
  });
}
```

### Phase 3: 数据迁移脚本

```typescript
// scripts/migrate-memory-to-layered.ts
async function migrateToLayeredMemory() {
  const documents = await prisma.sageMemoryDocument.findMany({
    where: {
      core: null, // 未迁移的记录
    },
  });

  for (const doc of documents) {
    await prisma.sageMemoryDocument.update({
      where: { id: doc.id },
      data: {
        core: doc.content,
        working: [],
        episodic: [],
      },
    });
  }

  console.log(`Migrated ${documents.length} documents`);
}
```

### Phase 4: 清理旧字段（迁移完成后）

```typescript
// Migration: remove_old_content_field.sql
ALTER TABLE "SageMemoryDocument"
  DROP COLUMN "content";

-- 同时更新字段为 NOT NULL
ALTER TABLE "SageMemoryDocument"
  ALTER COLUMN "core" SET NOT NULL;
```

---

## 版本控制详细策略

### 版本更新规则

```typescript
// 不更新版本的操作
const NO_VERSION_UPDATE_OPERATIONS = [
  "add_working_memory",      // 添加工作记忆
  "update_working_memory",   // 更新工作记忆状态
  "add_episodic_memory",     // 添加情景记忆
  "discard_working_memory",  // 丢弃工作记忆
];

// 更新版本的操作
const VERSION_UPDATE_OPERATIONS = [
  "initial_creation",        // 初始创建
  "integrate_working_memory", // 整合工作记忆到核心
  "manual_edit_core",        // 手动编辑核心记忆
  "interview_update_core",   // 访谈直接更新核心（旧方式，逐步淘汰）
];
```

### 版本号生成逻辑

```typescript
async function createOrUpdateMemoryDocument({
  sageId,
  operation: "add_working" | "integrate_working" | "add_episodic",
  coreMemory,
  workingMemory,
  episodicMemory,
  changeNotes,
}: {
  sageId: number;
  operation: string;
  coreMemory?: string;
  workingMemory?: WorkingMemoryItem[];
  episodicMemory?: EpisodicMemoryReference[];
  changeNotes: string;
}) {
  // 获取最新版本
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  const shouldUpdateVersion =
    operation === "integrate_working" ||
    operation === "initial_creation" ||
    operation === "manual_edit_core";

  if (!latestDoc) {
    // 首次创建，版本 1
    return await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: 1,
        core: coreMemory || "",
        working: workingMemory || [],
        episodic: episodicMemory || [],
        changeNotes,
        extra: {
          source: { type: "initial" },
        },
      },
    });
  }

  if (shouldUpdateVersion) {
    // 创建新版本
    return await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: latestDoc.version + 1,
        core: coreMemory || latestDoc.core,
        working: workingMemory || [],  // 整合后清空 working
        episodic: episodicMemory || latestDoc.episodic,
        changeNotes,
        extra: {
          source: { type: "manual" },
        },
      },
    });
  } else {
    // 更新当前版本（不增加版本号）
    return await prisma.sageMemoryDocument.update({
      where: { id: latestDoc.id },
      data: {
        working: workingMemory,
        episodic: episodicMemory,
        changeNotes: `${latestDoc.changeNotes}\n\n[Update] ${changeNotes}`,
        updatedAt: new Date(),
      },
    });
  }
}
```

---

## 使用示例

### 场景 1: 访谈后添加 Working Memory

```typescript
// 访谈结束后
const latestDoc = await getLatestMemoryDocument(sageId);

// 提取新知识
const newKnowledge: WorkingMemoryItem = {
  id: generateId(),
  content: "从访谈中提取的新知识内容...",
  source: "interview",
  sourceId: interviewId.toString(),
  relatedGapIds: [1, 2],
  status: "pending",
};

// 不增加版本号，直接更新
await createOrUpdateMemoryDocument({
  sageId,
  operation: "add_working",
  workingMemory: [...latestDoc.working, newKnowledge],
  changeNotes: `Added working memory from interview ${interviewId}`,
});
```

### 场景 2: 整合 Working Memory 到 Core

```typescript
// 用户触发"整合到核心记忆"
const latestDoc = await getLatestMemoryDocument(sageId);

// 筛选需要整合的 working items
const itemsToIntegrate = latestDoc.working.filter(
  (item) => item.status === "pending"
);

// 调用 AI 整合到 core
const updatedCore = await integrateWorkingMemoryToCore({
  currentCore: latestDoc.core,
  workingItems: itemsToIntegrate,
  locale,
});

// 创建新版本
await createOrUpdateMemoryDocument({
  sageId,
  operation: "integrate_working",
  coreMemory: updatedCore,
  workingMemory: [], // 清空 working memory
  episodicMemory: latestDoc.episodic, // 保持不变
  changeNotes: `Integrated ${itemsToIntegrate.length} working memory items into core`,
});

// 版本号：version + 1
```

### 场景 3: 添加 Episodic Memory

```typescript
// 对话结束后记录情景记忆（只存 chatId）
const episodicRef: EpisodicMemoryReference = userChatToken;

// 不增加版本号
await createOrUpdateMemoryDocument({
  sageId,
  operation: "add_episodic",
  episodicMemory: [...latestDoc.episodic, episodicRef],
  changeNotes: `Added episodic memory from chat ${userChatToken}`,
});
```

---

## UI 展示设计

### Memory Tab 新增功能

```
┌─────────────────────────────────────────────┐
│ Memory Management                           │
├─────────────────────────────────────────────┤
│                                             │
│ [Core Memory] [Working Memory] [Episodic]  │ <- Tabs
│                                             │
│ === Core Memory (Version 5) ===            │
│                                             │
│ [View History] [Edit]                       │
│                                             │
│ # Expert Profile                            │
│ ...核心知识内容...                           │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ === Working Memory (3 pending) ===         │
│                                             │
│ ┌─ From Interview #123                     │
│ │ Added: 2 hours ago                        │
│ │ Topics: AI Tools, Design Process          │
│ │ Confidence: 85%                            │
│ │ Status: Pending                            │
│ │                                            │
│ │ Content: [Preview...]                      │
│ │                                            │
│ │ [View Full] [Integrate] [Discard]         │
│ └───────────────────────────────────────────│
│                                             │
│ [Integrate All] [Clear Integrated]          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ === Episodic Memory (25 conversations) === │
│                                             │
│ ┌─ Chat with User #456                     │
│ │ Topic: Design System Best Practices       │
│ │ 1 day ago                                 │
│ │ Relevance: 70%                            │
│ │ [View Chat]                               │
│ └───────────────────────────────────────────│
│                                             │
│ [View All]                                  │
└─────────────────────────────────────────────┘
```

---

## 实施优先级

### P0 - 立即实施（Week 1）
1. ✅ Schema 添加新字段（nullable）
2. ✅ 更新 TypeScript 类型定义
3. ✅ 实现读取时的兼容逻辑
4. ✅ 实现双写逻辑

### P1 - 核心功能（Week 2）
5. ✅ 实现 Working Memory 添加逻辑
6. ✅ 实现 Episodic Memory 添加逻辑
7. ✅ 实现版本控制逻辑（区分是否更新版本）
8. ✅ 更新访谈后处理流程

### P2 - 整合功能（Week 3）
9. ✅ 实现"整合到核心记忆"功能
10. ✅ 实现 Working Memory 管理 UI
11. ✅ 数据迁移脚本

### P3 - 优化和清理（Week 4）
12. ✅ Episodic Memory UI
13. ✅ 执行数据迁移
14. ✅ 删除旧 content 字段
15. ✅ 性能优化和测试

---

## 关键决策总结

### ✅ 采纳的设计

1. **保留 content 字段** - 向后兼容
2. **新增三个字段** - core, working, episodic
3. **版本控制策略** - 只在整合时更新版本
4. **迁移策略** - 双写 → 迁移 → 删除旧字段

### ❌ 不采纳的备选方案

1. **全部放在 JSON 里** - 不利于查询和索引
2. **Working Memory 也创建新版本** - 版本号膨胀，失去意义
3. **立即删除 content** - 不兼容旧数据

### 🎯 核心优势

- ✅ 完全向后兼容
- ✅ 版本号有明确语义（反映核心知识演进）
- ✅ 支持快速添加临时知识
- ✅ 支持批量整合
- ✅ 清晰的数据分层
- ✅ 平滑迁移路径
