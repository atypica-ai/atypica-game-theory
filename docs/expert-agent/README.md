# Expert Agent System - Technical Design Document

## 概述 (Overview)

专家智能体系统是一个以**记忆管理为核心**的 AI 系统，允许用户构建具有专业知识的专家人设，并通过持续的交互和访谈不断完善专家的知识记忆。该系统类似于 Claude Code 使用 `CLAUDE.md` 作为系统上下文的方式，每个专家都有自己的"知识文档"（Memory Document），作为其核心记忆和身份定义。

### 核心理念

- **记忆即专家**: 专家的本质是其积累的知识和记忆，记忆文档 (Memory Document) 定义了专家的身份
- **渐进式构建**: 从初始导入到持续完善，专家知识是逐步积累的
- **多模态输入**: 支持文本、语音、文件等多种方式录入记忆
- **主动完善**: 系统主动发现知识空白，生成补充问题
- **实用工具集成**: 专家可以调用 deep research 等工具增强回答能力
- **社交分享**: 专家可以对外分享，让他人提问或与之对话

### 产品价值

1. **知识沉淀**: 将专家的隐性知识显性化，形成可复用的智能体
2. **24/7 可用**: 专家智能体随时可以回答问题，不受时间和地点限制
3. **持续进化**: 通过不断的交互和访谈，专家知识越来越完善
4. **知识分享**: 专家可以分享给团队或公众，扩大影响力
5. **思维助手**: 专家可以和创建者自己对话，辅助思考和决策

---

## 一、核心架构设计

### 1.1 核心概念

#### Expert (专家智能体)

- 基于现有 `Persona` 模型扩展
- 核心是 **Memory Document** (记忆文档)
- 具有专业领域和知识边界
- 支持工具调用能力（如 deep research）

#### Memory Document (记忆文档)

记忆文档是专家的"大脑"，类似于 Claude Code 的 `CLAUDE.md`，包含：

```markdown
# Expert Profile
- Name: [专家名称]
- Domain: [专业领域]
- Expertise: [专长列域]
- Language: [主要使用语言]

# Core Knowledge
[结构化的核心知识，按主题组织]

## Topic 1: [主题名称]
- Key Points: [关键知识点]
- Insights: [深度见解]
- Experience: [实践经验]

## Topic 2: [主题名称]
...

# Conversation Style
[专家的对话风格和特点]

# Knowledge Boundaries
[当前知识的边界和限制]

# Update History
[记忆更新的历史记录]
```

#### Memory Entry (记忆条目)

- 单条记忆的原子单位
- 包含时间戳、来源、内容、嵌入向量
- 支持分类和标签
- 可以被检索和引用

### 1.2 数据库设计

```prisma
// 扩展现有 Persona 模型
model Expert {
  id              Int      @id @default(autoincrement())
  token           String   @unique @db.VarChar(64)
  name            String   @db.VarChar(255)
  domain          String   @db.VarChar(255)  // 专业领域
  expertise       Json     @default("[]")     // 专长领域列表
  locale          String   @db.VarChar(16)

  // Memory Document - 核心记忆文档 (类似 CLAUDE.md)
  memoryDocument  String   @db.Text

  // 系统提示词 (从 memoryDocument 生成)
  systemPrompt    String   @db.Text

  // 向量嵌入 (用于专家匹配和检索)
  embedding       Unsupported("halfvec(1024)")?

  // 配置
  isPublic        Boolean  @default(false)  // 是否公开分享
  allowTools      Boolean  @default(true)   // 是否允许调用工具

  // 归属
  ownerId         Int
  owner           User     @relation(fields: [ownerId], references: [id])

  // 统计
  chatCount       Int      @default(0)
  memoryCount     Int      @default(0)
  lastActiveAt    DateTime?

  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)

  // 关系
  memories        ExpertMemory[]
  chats           ExpertChat[]
  interviews      ExpertInterview[]

  @@index([embedding])
  @@index([domain, locale])
  @@index([isPublic])
}

// 记忆条目
model ExpertMemory {
  id              Int      @id @default(autoincrement())
  expertId        Int
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)

  // 记忆内容
  content         String   @db.Text
  contentType     String   @db.VarChar(32)  // text, file, voice, interview

  // 分类和标签
  category        String?  @db.VarChar(64)  // 主题分类
  tags            Json     @default("[]")

  // 来源
  source          String   @db.VarChar(64)  // import, interview, chat, manual
  sourceId        String?  @db.VarChar(128) // 来源记录 ID

  // 向量嵌入
  embedding       Unsupported("halfvec(1024)")?

  // 元数据
  metadata        Json     @default("{}")

  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)

  @@index([expertId])
  @@index([embedding])
  @@index([category])
  @@index([source])
}

// 专家访谈 (类似 PersonaImport 的 follow-up interview)
model ExpertInterview {
  id              Int      @id @default(autoincrement())
  expertId        Int
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)

  userChatId      Int      @unique
  userChat        UserChat @relation(fields: [userChatId], references: [id])

  // 访谈目标
  purpose         String   @db.Text         // 本次访谈的目的
  focusAreas      Json     @default("[]")   // 重点关注的领域

  // 访谈状态
  status          String   @db.VarChar(32)  // draft, ongoing, completed
  progress        Float    @default(0)      // 完成度 0-1

  // 访谈结果
  newMemoryCount  Int      @default(0)
  summary         String?  @db.Text

  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)

  @@index([expertId])
  @@index([status])
}

// 专家对话
model ExpertChat {
  id              Int      @id @default(autoincrement())
  expertId        Int
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)

  userChatId      Int      @unique
  userChat        UserChat @relation(fields: [userChatId], references: [id])

  // 对话类型
  chatType        String   @db.VarChar(32)  // consultation, brainstorm, interview

  // 对话者
  userId          Int
  user            User     @relation(fields: [userId], references: [id])

  // 统计
  messageCount    Int      @default(0)
  memoryGenerated Int      @default(0)      // 产生的新记忆数

  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)

  @@index([expertId])
  @@index([userId])
}
```

---

## 二、核心功能实现

### 2.1 专家构建流程

#### Phase 1: 初始导入 (类似 Persona Import)

```typescript
// src/app/(expert)/actions.ts
"use server";

import { withAuth } from "@/lib/request/withAuth";
import { prisma } from "@/prisma/client";

/**
 * 创建专家并导入初始内容
 */
export const createExpert = withAuth(
  async ({ user }, data: {
    name: string;
    domain: string;
    locale: string;
    initialContent: {
      type: "text" | "file" | "voice";
      content: string;
      fileId?: string;
    }[];
  }) => {
    // 1. 创建专家记录
    const expert = await prisma.expert.create({
      data: {
        token: generateToken(),
        name: data.name,
        domain: data.domain,
        locale: data.locale,
        ownerId: user.id,
        memoryDocument: generateInitialMemoryDocument(data),
        systemPrompt: "", // 稍后生成
      }
    });

    // 2. 处理初始内容并创建记忆条目
    for (const item of data.initialContent) {
      await processInitialContent(expert.id, item);
    }

    // 3. 分析记忆并生成 Memory Document
    const memoryDocument = await buildMemoryDocument(expert.id);

    // 4. 从 Memory Document 生成系统提示词
    const systemPrompt = await generateSystemPrompt(memoryDocument);

    // 5. 生成向量嵌入
    const embedding = await generateEmbedding(memoryDocument);

    // 6. 更新专家
    await prisma.expert.update({
      where: { id: expert.id },
      data: {
        memoryDocument,
        systemPrompt,
        embedding,
      }
    });

    return { success: true, data: expert };
  }
);
```

#### Phase 2: 补充访谈 (类似 Follow-up Interview)

```typescript
/**
 * 创建补充访谈
 */
export const createSupplementaryInterview = withAuth(
  async ({ user }, expertId: number) => {
    const expert = await prisma.expert.findUnique({
      where: { id: expertId },
      include: { memories: true }
    });

    if (!expert) {
      return { success: false, message: "Expert not found" };
    }

    // 1. 分析知识空白
    const knowledgeGaps = await analyzeKnowledgeGaps(expert);

    // 2. 生成补充问题
    const followUpQuestions = await generateFollowUpQuestions(
      expert,
      knowledgeGaps
    );

    // 3. 创建访谈会话
    const userChat = await prisma.userChat.create({
      data: {
        kind: "expert_interview",
        userId: user.id,
        locale: expert.locale,
      }
    });

    const interview = await prisma.expertInterview.create({
      data: {
        expertId: expert.id,
        userChatId: userChat.id,
        purpose: "补充专家知识，填补知识空白",
        focusAreas: knowledgeGaps.map(g => g.area),
        status: "ongoing",
      }
    });

    // 4. 发送初始消息
    await sendInitialInterviewMessage(userChat.id, followUpQuestions);

    return { success: true, data: { interview, userChat } };
  }
);
```

### 2.2 记忆管理核心

#### 记忆文档构建

```typescript
// src/app/(expert)/memory/builder.ts

/**
 * 从记忆条目构建 Memory Document
 * 类似于将多个代码文件整合成一个 CLAUDE.md
 */
export async function buildMemoryDocument(expertId: number): Promise<string> {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: {
      memories: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!expert) throw new Error("Expert not found");

  // 1. 按主题聚类记忆
  const categorizedMemories = await categorizeMemories(expert.memories);

  // 2. 使用 AI 生成结构化记忆文档
  const memoryDocument = await generateMemoryDocument({
    expert,
    categorizedMemories,
    locale: expert.locale,
  });

  return memoryDocument;
}

/**
 * 使用 AI 将分散的记忆条目整合成结构化文档
 */
async function generateMemoryDocument(data: {
  expert: Expert;
  categorizedMemories: Map<string, ExpertMemory[]>;
  locale: string;
}): Promise<string> {
  const { expert, categorizedMemories, locale } = data;

  const result = await generateText({
    model: llm("claude-3-5-sonnet"),
    system: `You are a knowledge architect. Your task is to organize scattered memory entries into a well-structured Memory Document that defines an expert's identity and knowledge.

The Memory Document should follow this structure:
1. Expert Profile (name, domain, expertise, language)
2. Core Knowledge (organized by topics)
3. Conversation Style
4. Knowledge Boundaries
5. Update History

Make the document clear, comprehensive, and easy for an AI to use as system context.`,
    prompt: `Create a Memory Document for this expert:

Name: ${expert.name}
Domain: ${expert.domain}
Locale: ${locale}

Memory Entries (${categorizedMemories.size} categories):
${Array.from(categorizedMemories.entries()).map(([category, memories]) => `
## ${category}
${memories.map(m => `- ${m.content}`).join("\n")}
`).join("\n")}

Generate a well-structured Memory Document in markdown format.`,
  });

  return result.text;
}
```

#### 记忆检索和使用

```typescript
// src/app/(expert)/memory/retrieval.ts

/**
 * 根据查询检索相关记忆
 */
export async function retrieveRelevantMemories(
  expertId: number,
  query: string,
  options: {
    limit?: number;
    categories?: string[];
  } = {}
): Promise<ExpertMemory[]> {
  const { limit = 10, categories } = options;

  // 1. 生成查询向量
  const queryEmbedding = await generateEmbedding(query);

  // 2. 向量相似度搜索
  const memories = await prisma.$queryRaw<ExpertMemory[]>`
    SELECT
      id, expert_id, content, category, tags, source,
      metadata, created_at, updated_at,
      1 - (embedding <=> ${queryEmbedding}::halfvec) as similarity
    FROM expert_memory
    WHERE expert_id = ${expertId}
      ${categories ? Prisma.sql`AND category = ANY(${categories})` : Prisma.empty}
    ORDER BY embedding <=> ${queryEmbedding}::halfvec
    LIMIT ${limit}
  `;

  return memories;
}

/**
 * 增强专家对话上下文
 * 在对话时注入相关记忆
 */
export async function enhanceExpertContext(
  expertId: number,
  conversationHistory: Message[],
  currentQuery: string
): Promise<string> {
  // 1. 获取专家基础信息
  const expert = await prisma.expert.findUnique({
    where: { id: expertId }
  });

  if (!expert) throw new Error("Expert not found");

  // 2. 检索相关记忆
  const relevantMemories = await retrieveRelevantMemories(
    expertId,
    currentQuery,
    { limit: 5 }
  );

  // 3. 构建增强上下文
  const enhancedContext = `
# Memory Document
${expert.memoryDocument}

# Relevant Memories for Current Query
${relevantMemories.map((m, i) => `
## Relevant Memory ${i + 1} (${m.category})
${m.content}
`).join("\n")}
`;

  return enhancedContext;
}
```

### 2.3 专家对话实现

```typescript
// src/app/(expert)/(chat)/api/chat/route.ts

export async function POST(req: Request) {
  const { expertId, messages, chatId } = await req.json();

  // 1. 获取专家和对话历史
  const expert = await prisma.expert.findUnique({
    where: { id: expertId }
  });

  if (!expert) {
    return new Response("Expert not found", { status: 404 });
  }

  // 2. 获取当前用户查询
  const currentQuery = messages[messages.length - 1].content;

  // 3. 增强上下文 (Memory Document + 相关记忆)
  const enhancedContext = await enhanceExpertContext(
    expertId,
    messages,
    currentQuery
  );

  // 4. 准备工具 (如果允许)
  const tools = expert.allowTools ? {
    deepResearch: reasoningThinkingTool,
    googleSearch: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0.3,
    }),
  } : undefined;

  // 5. 流式生成回答
  const result = streamText({
    model: llm("claude-3-5-sonnet"),
    system: `${enhancedContext}

You are ${expert.name}, an expert in ${expert.domain}.
Use your Memory Document as your knowledge base.
When answering questions:
1. Draw from your documented knowledge
2. Be honest about knowledge boundaries
3. Use tools when needed for research
4. Maintain your conversation style`,
    messages: await convertDBMessagesToAIMessages(messages),
    tools,

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    onStepFinish: async (step) => {
      // 保存对话
      await saveConversationStep(chatId, step);

      // 追踪 token 使用
      await trackTokenUsage(step);

      // 如果发现新知识，标记为潜在记忆
      await identifyPotentialMemories(expertId, step);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### 2.4 自动记忆更新

```typescript
// src/app/(expert)/memory/auto-update.ts

/**
 * 每日总结对话，生成补充问题
 */
export async function dailyMemoryUpdate(expertId: number) {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: {
      chats: {
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 过去 24 小时
          }
        },
        include: {
          userChat: {
            include: {
              messages: true
            }
          }
        }
      }
    }
  });

  if (!expert || expert.chats.length === 0) return;

  // 1. 分析对话中的知识空白
  const conversations = expert.chats.map(c => c.userChat.messages);
  const knowledgeGaps = await analyzeConversationsForGaps(
    expert,
    conversations
  );

  // 2. 生成补充问题
  const followUpQuestions = await generateFollowUpQuestions(
    expert,
    knowledgeGaps
  );

  // 3. 创建待处理的访谈建议
  await prisma.expertInterviewSuggestion.create({
    data: {
      expertId: expert.id,
      purpose: "根据近期对话补充知识",
      suggestedQuestions: followUpQuestions,
      priority: calculatePriority(knowledgeGaps),
    }
  });

  // 4. 通知专家所有者
  await notifyOwner(expert.ownerId, {
    type: "memory_update_suggestion",
    expertId: expert.id,
    questionsCount: followUpQuestions.length,
  });
}

/**
 * 分析对话中的知识空白
 */
async function analyzeConversationsForGaps(
  expert: Expert,
  conversations: Message[][]
): Promise<KnowledgeGap[]> {
  const result = await generateObject({
    model: llm("gpt-4o"),
    schema: z.object({
      gaps: z.array(z.object({
        area: z.string().describe("知识空白的领域"),
        severity: z.enum(["low", "medium", "high"]),
        evidence: z.string().describe("从对话中发现的证据"),
        suggestedQuestion: z.string().describe("建议的补充问题"),
      }))
    }),
    prompt: `Analyze these conversations to identify knowledge gaps in the expert's memory.

Expert: ${expert.name}
Domain: ${expert.domain}
Current Memory Document:
${expert.memoryDocument}

Recent Conversations:
${conversations.map((conv, i) => `
## Conversation ${i + 1}
${conv.map(m => `${m.role}: ${m.content}`).join("\n")}
`).join("\n")}

Identify:
1. Questions the expert couldn't answer well
2. Topics where the expert showed uncertainty
3. Areas where more depth is needed
4. New topics that emerged but lack coverage`,
  });

  return result.object.gaps;
}
```

---

## 三、用户体验设计

### 3.1 专家创建流程

```
1. 创建专家
   ├─ 输入基本信息 (名称、领域、语言)
   └─ 上传初始内容
      ├─ 文本输入
      ├─ 文件上传 (PDF, Word, Markdown, etc.)
      └─ 语音录入

2. 初始分析
   ├─ AI 分析内容
   ├─ 提取关键知识点
   └─ 生成 Memory Document v1

3. 补充访谈 (可选)
   ├─ AI 分析知识完整度
   ├─ 生成补充问题
   └─ 用户回答 → 更新记忆

4. 完成
   ├─ 预览专家人设
   ├─ 测试对话
   └─ 发布/分享
```

### 3.2 记忆管理界面

```
专家详情页
├─ Memory Document 查看/编辑
├─ 记忆条目列表
│  ├─ 按主题分类
│  ├─ 按来源筛选
│  └─ 搜索功能
├─ 知识图谱可视化 (未来)
└─ 更新建议
   ├─ 待补充的问题
   └─ 一键开启访谈
```

### 3.3 对话界面

```
专家对话页
├─ 专家信息卡片
│  ├─ 名称和领域
│  ├─ 知识覆盖度
│  └─ 最近更新时间
├─ 对话区域
│  ├─ 支持文本输入
│  ├─ 支持语音输入
│  ├─ 支持文件上传
│  └─ 工具调用展示
└─ 侧边栏
   ├─ 相关记忆展示
   └─ 知识来源引用
```

---

## 四、实施路线图

### Phase 1: 核心记忆系统 (MVP)

**目标**: 实现基础的专家创建和记忆管理

**功能**:
- ✅ 数据库 Schema 设计
- ✅ 专家创建和初始导入
- ✅ Memory Document 生成
- ✅ 记忆条目管理 (CRUD)
- ✅ 基础对话功能

**技术要点**:
- 复用 Persona Import 的文件处理逻辑
- 实现 Memory Document 构建器
- 实现向量嵌入和相似度搜索

**估计工期**: 2 周

### Phase 2: 智能补充访谈

**目标**: 实现主动的知识完善机制

**功能**:
- ✅ 知识空白分析
- ✅ 补充问题生成
- ✅ 访谈流程实现
- ✅ 记忆自动更新

**技术要点**:
- 复用 Follow-up Interview 逻辑
- 实现知识完整度评估
- 实现对话分析和记忆提取

**估计工期**: 1.5 周

### Phase 3: 多模态输入

**目标**: 支持语音和文件等多种记忆录入方式

**功能**:
- ✅ 语音转文本
- ✅ 文件解析 (PDF, Word, etc.)
- ✅ 实时记忆录入
- ✅ 批量导入优化

**技术要点**:
- 集成语音识别服务
- 复用现有文件解析逻辑
- 优化嵌入生成性能

**估计工期**: 1 周

### Phase 4: 工具集成和分享

**目标**: 增强专家能力和社交功能

**功能**:
- ✅ Deep Research 工具集成
- ✅ Google Search 集成
- ✅ 专家公开分享
- ✅ 分享链接和嵌入

**技术要点**:
- 工具权限控制
- 公开访问控制
- iframe 嵌入支持 (复用现有)

**估计工期**: 1 周

### Phase 5: 自动化和优化

**目标**: 提升用户体验和系统智能化

**功能**:
- ✅ 每日记忆更新提醒
- ✅ 知识图谱可视化
- ✅ 智能问答推荐
- ✅ 性能优化

**技术要点**:
- 定时任务调度
- 前端可视化库
- 查询性能优化
- 缓存策略

**估计工期**: 2 周

---

## 五、技术实现要点

### 5.1 Memory Document 设计原则

1. **人类可读**: 使用 Markdown 格式，人类可以直接阅读和编辑
2. **AI 友好**: 结构化组织，方便 AI 理解和使用
3. **版本控制**: 记录更新历史，支持回溯
4. **模块化**: 按主题组织，便于局部更新
5. **元数据丰富**: 包含知识边界、更新时间等元信息

### 5.2 向量嵌入策略

```typescript
// 分层嵌入策略
interface EmbeddingStrategy {
  // Expert 级别: 整个 Memory Document 的嵌入
  expertEmbedding: Vector;

  // Memory Entry 级别: 单条记忆的嵌入
  memoryEmbeddings: Vector[];

  // 检索时: 先匹配 Expert，再匹配 Memory
  retrievalFlow: "expert-first" | "memory-first" | "hybrid";
}

// 使用 text-embedding-3-large 生成嵌入
async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: text,
  });

  return result.embedding;
}
```

### 5.3 性能优化

1. **Memory Document 缓存**: 在内存中缓存常用专家的 Memory Document
2. **向量检索优化**: 使用 pgvector 的索引加速相似度搜索
3. **批量嵌入生成**: 批量处理多个记忆条目的嵌入生成
4. **增量更新**: 只更新变化的部分，不重新生成整个文档

### 5.4 安全和隐私

1. **权限控制**: 专家所有者才能编辑和管理
2. **公开控制**: 明确的公开/私有设置
3. **数据隔离**: 团队成员的专家数据隔离
4. **审计日志**: 记录所有记忆更新操作

---

## 六、与现有系统的集成

### 6.1 复用现有功能

| 现有功能 | 复用场景 |
|---------|---------|
| Persona Import | 专家初始导入流程 |
| Follow-up Interview | 补充访谈机制 |
| UserChat | 对话会话管理 |
| AttachmentFile | 文件上传和解析 |
| 语音识别 | 语音记忆录入 |
| iframe 嵌入 | 专家分享和嵌入 |

### 6.2 数据迁移

```typescript
// 支持从 Persona 迁移到 Expert
async function migratePersonaToExpert(personaId: number) {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId }
  });

  if (!persona) throw new Error("Persona not found");

  // 创建专家
  const expert = await prisma.expert.create({
    data: {
      token: persona.token,
      name: persona.name,
      domain: extractDomain(persona.source),
      locale: persona.locale || "en",
      ownerId: getPersonaOwner(persona),
      memoryDocument: convertPromptToMemoryDocument(persona.prompt),
      systemPrompt: persona.prompt,
      embedding: persona.embedding,
    }
  });

  return expert;
}
```

---

## 七、示例使用场景

### 场景 1: 产品经理创建产品专家

```
1. 小明是一名资深产品经理
2. 他上传了自己的产品文档、会议记录、博客文章
3. 系统生成了一个"产品专家"
4. 系统分析后发现缺少"竞品分析"相关知识
5. 小明通过补充访谈回答了 5 个竞品相关问题
6. 专家完善后，小明将其分享给团队
7. 团队成员可以随时向专家咨询产品问题
8. 专家在回答时可以调用 deep research 查找最新信息
```

### 场景 2: 研究员与自己的专家对话

```
1. 李博士是一名 AI 研究员
2. 他创建了一个"AI 研究专家"记录自己的研究思路
3. 每天通过语音记录新的想法和发现
4. 系统自动更新专家的知识库
5. 李博士遇到问题时,与专家对话寻求灵感
6. 专家基于李博士的历史研究给出建议
7. 系统每周生成补充问题,帮助李博士反思
```

### 场景 3: 顾问专家公开分享

```
1. 王老师是一名管理顾问
2. 他创建了"管理咨询专家"并设为公开
3. 任何人都可以访问这个专家咨询问题
4. 每天的对话被汇总,生成新的补充问题
5. 王老师定期回答这些问题,完善专家知识
6. 专家的知识越来越丰富,影响力不断扩大
7. 王老师可以将专家嵌入到自己的网站
```

---

## 八、未来展望

1. **知识图谱**: 可视化专家的知识结构和关联
2. **多专家协作**: 多个专家共同回答复杂问题
3. **主动学习**: 专家主动发现知识空白并请求补充
4. **个性化推荐**: 根据用户兴趣推荐相关专家
5. **版本管理**: 支持专家知识的版本回退和对比
6. **导出功能**: 导出专家知识为文档或网站

---

## 九、总结

专家智能体系统以**记忆管理为核心**,通过结构化的 Memory Document 定义专家身份,通过持续的交互和访谈完善专家知识,通过向量检索和工具集成增强专家能力。

**核心优势**:
- 简化的记忆管理模型 (类似 CLAUDE.md)
- 渐进式的知识构建流程
- 强大的 AI 能力支持
- 良好的用户体验
- 与现有系统深度集成

**实施策略**:
- MVP 先行,快速验证核心价值
- 分阶段迭代,逐步完善功能
- 复用现有代码,降低开发成本
- 注重用户反馈,持续优化体验

通过这个系统,我们可以将专家的隐性知识显性化,让 AI 成为真正有用的智能助手,而不仅仅是一个聊天机器人。
