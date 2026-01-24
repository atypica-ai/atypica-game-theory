# PersonaPanel 统一化：隐式 Panel 管理

## 背景

当前系统中，`discussionChat` 和 `interviewChat` 两个工具的设计不一致：

```typescript
// ❌ 当前状态：不一致
discussionChat({ personaIds: [1, 2, 3], instruction })
  → DiscussionTimeline (虽然 schema 有 personaPanelId，但代码未使用)

interviewChat({ personas: [{ id: 1 }, { id: 2 }], instruction })
  → AnalystInterview (关联 analystId)
```

**核心问题**：
1. **接口不统一**：`discussionChat` 传 `personaIds`，`interviewChat` 传 `personas`
2. **数据追溯不一致**：`DiscussionTimeline` 有 Panel 支持但未使用，`AnalystInterview` 通过 Analyst 关联
3. **过时的依赖**：`AnalystInterview.analystId` 原本用于聚合数据生成报告，但现在报告已改为从 messages 生成
4. **用户体验问题**：如果显式要求用户选择/创建 Panel，会增加交互复杂度

从 `src/app/(study)/agents/studyLog/index.ts:88-98` 注释可见：
> 不再需要从 analyst.interviews.conclusion 读取访谈结论
> 所有研究内容(包括访谈总结、讨论总结)都已包含在 messages 中

## 目标

**统一架构 + 隐式 Panel 管理**：

```typescript
// ✅ 用户视角：接口保持简单
discussionChat({ personaIds: [1, 2, 3], instruction })
interviewChat({ personas: [{ id: 1 }, { id: 2 }], instruction })

// ✅ 系统内部：自动管理 Panel
UserChat.context.interviewPersonaPanelId → PersonaPanel → AnalystInterview[]
UserChat.context.discussionPersonaPanelId → PersonaPanel → DiscussionTimeline[]
```

**核心设计理念**：
1. **用户无需感知 Panel**：接口保持简单，传 `personas` 或 `personaIds`
2. **系统自动管理**：从 `UserChat.context` 读取/创建 Panel ID
3. **增量更新**：每次调用自动追加新 personas 到 Panel
4. **平滑迁移**：首次调用时自动迁移 `analystId` 的历史访谈

**收益**：
- ✅ **用户体验**：无需理解 Panel 概念
- ✅ **数据追溯**：清晰记录"哪次研究用了哪个 Panel"
- ✅ **防重复**：基于 `(personaPanelId, personaId)` unique constraint
- ✅ **架构简化**：`analystId` 改为可选，仅用于历史数据

## 实现：隐式 Panel 管理

### 核心流程

```typescript
// src/app/(study)/tools/interviewChat/index.ts

execute: async ({ personas, instruction }) => {
  // 1️⃣ 从 UserChat.context 读取 Panel ID
  const { context, analyst } = await prisma.userChat.findUniqueOrThrow({
    where: { id: userChatId },
    select: { context: true, analyst: true },
  });

  let interviewPersonaPanelId = context.interviewPersonaPanelId;

  if (!interviewPersonaPanelId) {
    // 2️⃣ 首次调用：创建 Panel
    // 合并历史访谈（从 analystId）+ 当前请求的 personas
    const interviews = await prisma.analystInterview.findMany({
      where: { analystId: analyst?.id },
      select: { id: true, personaId: true },
    });

    const personaPanel = await prisma.personaPanel.create({
      data: {
        userId,
        personaIds: mergeIds(
          interviews.map(i => i.personaId),  // 历史数据
          personas.map(p => p.id)            // 当前请求
        ),
      },
    });

    // 3️⃣ 保存 Panel ID 到 context
    await mergeUserChatContext({
      id: userChatId,
      context: { interviewPersonaPanelId: personaPanel.id },
    });

    // 4️⃣ 迁移历史访谈到新 Panel
    await prisma.analystInterview.updateMany({
      where: { id: { in: interviews.map(i => i.id) } },
      data: { personaPanelId: personaPanel.id },
    });

  } else {
    // 5️⃣ 后续调用：更新 Panel，追加新 personas
    const personaPanel = await prisma.personaPanel.findUniqueOrThrow({
      where: { id: interviewPersonaPanelId },
    });

    await prisma.personaPanel.update({
      where: { id: interviewPersonaPanelId },
      data: {
        personaIds: mergeIds(
          personaPanel.personaIds,
          personas.map(p => p.id)
        ),
      },
    });
  }

  // 6️⃣ 防重复：基于 (personaPanelId, personaId)
  for (const { id: personaId, name } of personas) {
    const interview = await prisma.analystInterview.findFirst({
      where: { personaPanelId: interviewPersonaPanelId, personaId },
    });

    if (interview?.conclusion) {
      // 复用之前的访谈结论
      continue;
    }

    // 7️⃣ 创建新访谈
    await prisma.analystInterview.create({
      data: {
        personaPanelId: interviewPersonaPanelId,
        personaId,
        instruction,
        conclusion: "",
      },
    });

    // ... 执行访谈
  }
}
```

### 关键设计点

1. **UserChat.context 存储 Panel ID**
   ```typescript
   // context 字段新增
   {
     interviewPersonaPanelId: 123,    // 访谈专用 Panel
     discussionPersonaPanelId: 456,   // 讨论专用 Panel
     // ... 其他 context 字段
   }
   ```

2. **首次调用时的数据迁移**
   - 查找所有 `analystId` 关联的历史访谈
   - 创建新 Panel，包含历史 + 当前 personas
   - 更新历史访谈的 `personaPanelId`
   - `analystId` 保留（用于历史查询）

3. **增量更新 Panel**
   - 每次调用追加新 personas 到 `personaIds` 数组
   - Panel 记录了该研究涉及的所有受访群体

4. **防重复机制**
   - 查询：`(personaPanelId, personaId)` unique
   - 如果已访谈且有 conclusion，直接复用
   - 否则创建新访谈记录

## 架构变更

### Schema 变更

```diff
model PersonaPanel {
  id         Int
  userId     Int
  personaIds Json  // [1, 2, 3, 4, 5]

  discussionTimelines DiscussionTimeline[]
+ analystInterviews   AnalystInterview[]    // 新增关系
}

model DiscussionTimeline {
- personaPanelId Int?          // 改为必填
+ personaPanelId Int
  personaPanel   PersonaPanel
  // ...
}

model AnalystInterview {
  id                   Int       @id @default(autoincrement())

- analystId            Int       // 删除
- analyst              Analyst
+ studyUserChatId      Int       // 新增：直接关联研究会话
+ studyUserChat        UserChat
+ personaPanelId       Int       // 新增：记录来自哪个 Panel
+ personaPanel         PersonaPanel

  personaId            Int
  persona              Persona
  instruction          String    @db.Text
  conclusion           String    @db.Text
  interviewUserChatId  Int?      @unique
  interviewUserChat    UserChat?

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

- @@unique([analystId, personaId])     // 旧：防止同一研究重复访谈同一人
+ @@unique([studyUserChatId, personaId])  // 新：防止重复
+ @@index([studyUserChatId])
+ @@index([personaPanelId])
}

model Analyst {
  // ... 保留所有字段

- interviews      AnalystInterview[]  // 删除这个关系（不再用于聚合数据）

  reports         AnalystReport[]
  podcasts        AnalystPodcast[]
}
```

### 数据流变更

**Before**：
```
studyUserChat → analyst → analystId
                    ↓
              AnalystInterview[] → (过时：原本用于聚合数据)
```

**After**：
```
studyUserChat → messages → studyLog → 报告  ✅ 主流程

studyUserChat ─┐
               ├→ AnalystInterview (防止重复访谈)
PersonaPanel ──┘        ↓
                  记录 Panel 来源
```

## 代码改动

### 1. discussionChat 工具

```diff
// src/app/(study)/tools/discussionChat/types.ts
export const discussionChatInputSchema = z.object({
- personaIds: z.array(z.number()).min(2),
+ personaPanelId: z.number(),
  instruction: z.string(),
  timelineToken: z.string().optional().transform(() => generateToken()),
});
```

```diff
// src/app/(study)/tools/discussionChat/index.ts
export const discussionChatTool = ({ userId, locale, ... }) =>
  tool({
-   execute: async ({ instruction, personaIds, timelineToken }) => {
+   execute: async ({ instruction, personaPanelId, timelineToken }) => {
+     // 1. 获取 Panel
+     const panel = await prisma.personaPanel.findUniqueOrThrow({
+       where: { id: personaPanelId },
+     });
+     const personaIds = panel.personaIds as number[];

      // 2. 创建 Timeline（关联 Panel）
      const discussionTimeline = await prisma.discussionTimeline.create({
        data: {
          token: timelineToken,
+         personaPanelId,  // ✅ 关联 Panel
          instruction,
          events: [],
          summary: "",
          minutes: "",
        },
      });

      // 3. 执行讨论
      await runPersonaDiscussion({ personaIds, ... });
    }
  });
```

### 2. interviewChat 工具

```diff
// src/app/(study)/tools/interviewChat/types.ts
export const interviewChatInputSchema = z.object({
- personas: z.array(
-   z.object({
-     id: z.number(),
-     name: z.string(),
-   })
- ),
+ personaPanelId: z.number(),
  instruction: z.string(),
});
```

```diff
// src/app/(study)/tools/interviewChat/index.ts
export const interviewChatTool = ({ userId, studyUserChatId, ... }) =>
  tool({
-   execute: async ({ personas, instruction }) => {
-     // ❌ 旧：从 studyUserChat 获取 analystId
-     const { analyst } = await prisma.userChat.findUniqueOrThrow({
-       where: { id: studyUserChatId, kind: "study" },
-       select: { analyst: { select: { id: true } } },
-     });
-     const analystId = analyst.id;

+   execute: async ({ personaPanelId, instruction }) => {
+     // ✅ 新：从 Panel 获取 personas
+     const panel = await prisma.personaPanel.findUniqueOrThrow({
+       where: { id: personaPanelId },
+     });
+     const personaIds = panel.personaIds as number[];
+
+     const personas = await prisma.persona.findMany({
+       where: { id: { in: personaIds } },
+     });

      const single = async ({ id: personaId, name }) => {
        try {
-         // ❌ 旧：检查是否重复访谈（基于 analystId）
+         // ✅ 新：检查是否重复访谈（基于 studyUserChatId）
          const interview = await prisma.analystInterview.findUnique({
-           where: { analystId_personaId: { analystId, personaId } },
+           where: { studyUserChatId_personaId: { studyUserChatId, personaId } },
          });

          if (interview?.conclusion) {
            return { name, conclusion: interview.conclusion };
          }

-         // ❌ 旧：创建访谈记录（关联 analystId）
+         // ✅ 新：创建访谈记录（关联 studyUserChatId 和 personaPanelId）
          const { analystInterviewId, interviewUserChatId, ... } =
            await prepareDBForInterview({
              userId,
              personaId,
-             analystId,
+             studyUserChatId,
+             personaPanelId,
              instruction,
              locale,
            });

          await runInterview({ ... });

          const updatedInterview = await prisma.analystInterview.findUniqueOrThrow({
            where: { id: analystInterviewId },
          });

          return { name, conclusion: updatedInterview.conclusion };
        } catch (error) {
          return { name, issue: `Interview encountered an issue: ${error.message}` };
        }
      };

      const interviewResults = await Promise.all(personas.map(single));
      // ... 生成 summary
    }
  });
```

```diff
// src/app/(study)/tools/interviewChat/index.ts - prepareDBForInterview
export async function prepareDBForInterview({
  userId,
  personaId,
- analystId,
+ studyUserChatId,
+ personaPanelId,
  instruction,
  locale,
}) {
  const [persona, analyst] = await Promise.all([
    prisma.persona.findUniqueOrThrow({ where: { id: personaId } }),
-   prisma.analyst.findUniqueOrThrow({ where: { id: analystId } }),
+   prisma.userChat.findUniqueOrThrow({
+     where: { id: studyUserChatId },
+     include: { analyst: true }
+   }).then(chat => chat.analyst!),
  ]);

  const interview = await prisma.analystInterview.upsert({
    where: {
-     analystId_personaId: { analystId, personaId },
+     studyUserChatId_personaId: { studyUserChatId, personaId },
    },
    update: { instruction, conclusion: "" },
-   create: { analystId, personaId, instruction, conclusion: "" },
+   create: {
+     studyUserChatId,
+     personaPanelId,
+     personaId,
+     instruction,
+     conclusion: ""
+   },
  });

  // ... rest
}
```

### 3. 删除过时的查询

```diff
// 所有文件中，删除类似这样的查询：
- const analyst = await prisma.analyst.findUnique({
-   where: { id },
-   include: { interviews: true }  // ❌ 删除
- });
```

## 迁移步骤

### 1. 创建迁移文件

```sql
-- Add new columns
ALTER TABLE "AnalystInterview"
  ADD COLUMN "studyUserChatId" INTEGER,
  ADD COLUMN "personaPanelId" INTEGER;

-- Backfill data from existing analystId
UPDATE "AnalystInterview" ai
SET
  "studyUserChatId" = (
    SELECT a."studyUserChatId"
    FROM "Analyst" a
    WHERE a.id = ai."analystId"
  );

-- For personaPanelId, create temporary panels for old data
-- (or set to NULL if schema allows)
INSERT INTO "PersonaPanel" ("userId", "personaIds", "createdAt", "updatedAt")
SELECT DISTINCT
  a."userId",
  '[]'::json,
  NOW(),
  NOW()
FROM "AnalystInterview" ai
JOIN "Analyst" a ON a.id = ai."analystId"
WHERE ai."personaPanelId" IS NULL
RETURNING id;

-- Update with temporary panel IDs
-- (具体实现取决于需求，可能需要手动处理老数据)

-- Make DiscussionTimeline.personaPanelId required
ALTER TABLE "DiscussionTimeline"
  ALTER COLUMN "personaPanelId" SET NOT NULL;

-- Drop old constraints
ALTER TABLE "AnalystInterview"
  DROP CONSTRAINT IF EXISTS "AnalystInterview_analystId_personaId_key";

-- Add new constraints
ALTER TABLE "AnalystInterview"
  ADD CONSTRAINT "AnalystInterview_studyUserChatId_personaId_key"
    UNIQUE ("studyUserChatId", "personaId");

-- Add foreign keys
ALTER TABLE "AnalystInterview"
  ADD CONSTRAINT "AnalystInterview_studyUserChatId_fkey"
    FOREIGN KEY ("studyUserChatId") REFERENCES "UserChat"("id"),
  ADD CONSTRAINT "AnalystInterview_personaPanelId_fkey"
    FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id");

-- Create indexes
CREATE INDEX "AnalystInterview_studyUserChatId_idx"
  ON "AnalystInterview"("studyUserChatId");
CREATE INDEX "AnalystInterview_personaPanelId_idx"
  ON "AnalystInterview"("personaPanelId");

-- Drop old column (after verifying migration success)
ALTER TABLE "AnalystInterview" DROP COLUMN "analystId";
```

### 2. 前端改动

用户在调用 `discussionChat` 或 `interviewChat` 前，需要先选择或创建 `PersonaPanel`：

```typescript
// 新的 UI 流程
1. 用户选择 Personas (多选)
2. 系统检查是否有匹配的 Panel
   - 有：复用
   - 无：创建新 Panel
3. 调用 discussionChat({ personaPanelId, ... })
   或 interviewChat({ personaPanelId, ... })
```

## 验证清单

- [ ] Schema 迁移成功，数据完整
- [ ] `discussionChat` 工具正常工作
- [ ] `interviewChat` 工具正常工作
- [ ] 防止重复访谈机制正常（基于 `studyUserChatId_personaId`）
- [ ] 报告生成正常（确认不依赖 `analyst.interviews`）
- [ ] studyLog 生成正常（确认不依赖 `analyst.interviews`）
- [ ] 前端 UI 支持 Panel 选择/创建
- [ ] 所有 `include: { interviews: true }` 查询已删除

## 总结

这次改动完成了 **PersonaPanel 统一化**，核心改变：

| 维度 | Before | After |
|------|--------|-------|
| **接口** | `personaIds` vs `personas` | 统一为 `personaPanelId` |
| **关联** | `AnalystInterview.analystId` | `studyUserChatId` + `personaPanelId` |
| **数据流** | `analyst.interviews` 聚合 | `messages` → `studyLog` → 报告 |
| **复用性** | Panel 未被充分利用 | Panel 成为核心组织单元 |

符合 "Messages as Source of Truth" 架构理念，所有研究内容通过消息流转，数据库只存派生状态和防重复检查。
