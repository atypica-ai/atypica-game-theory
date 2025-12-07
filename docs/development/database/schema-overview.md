# 数据库架构概览

本文档介绍 atypica.AI 的数据库设计和核心数据模型。

## 技术栈

- **数据库**: PostgreSQL 15
- **ORM**: Prisma 7.1
- **扩展**: pgvector 0.8.1 (向量搜索)
- **连接优化**: Prisma Accelerate + Read Replicas

## 数据库配置

### Schema 文件

**位置**: `prisma/schema.prisma`

**特性**:

- 自定义输出路径：`src/prisma/generated`
- 使用 `postgresqlExtensions` 预览特性
- 支持 pgvector 扩展

### 权限要求

**开发环境**:

```sql
-- 创建 extension 时需要 SUPERUSER 权限
ALTER USER atypica WITH SUPERUSER;
-- 执行完 migration 后可以移除
ALTER USER atypica WITH NOSUPERUSER;
```

**生产环境**:

```sql
-- 先用 superuser 创建 extension
CREATE EXTENSION vector;
-- 然后正常执行 migrate deploy
```

## 核心数据模型

### 用户和团队模型

#### User - 用户

**类型**:

- **Personal User**: 独立个人用户（`teamIdAsMember` 为 null）
- **Team Member User**: 团队成员用户（关联到团队）

**关键字段**:

```prisma
model User {
  id             Int       @id @default(autoincrement())
  email          String?   @unique
  password       String
  emailVerified  DateTime?

  // 团队关系
  teamIdAsMember Int?      // 如果是团队成员，指向团队
  personalUserId Int?      // 如果是团队成员，指向对应的个人用户

  // 拥有的资源
  tokensAccount  TokensAccount?
  userChats      UserChat[]
  analysts       Analyst[]
  personas       Persona[]
}
```

#### Team - 团队

```prisma
model Team {
  id          Int    @id
  name        String
  seats       Int    // 团队席位数
  ownerUserId Int
  ownerUser   User   @relation("TeamOwner")
  members     User[] @relation("TeamMembership")

  tokensAccount TokensAccount?
  teamConfigs   TeamConfig[]
  subscriptions Subscription[]
}
```

#### TeamConfig - 团队配置

**用途**: 存储团队级别的配置（MCP、自定义 Prompt 等）

```prisma
model TeamConfig {
  id     Int    @id
  teamId Int
  key    String // TeamConfigName 枚举 (mcp, studySystemPrompt)
  value  Json   // 配置内容
}
```

### 认证和授权

#### ApiKey - API 密钥

```prisma
model ApiKey {
  id     Int    @id
  key    String @unique // atypica_{64 hex}
  userId Int?   // 个人用户 API Key
  teamId Int?   // 团队 API Key（互斥）
}
```

#### AdminUser - 管理员

```prisma
model AdminUser {
  id     Int        @id
  userId Int        @unique
  role   AdminRole  // admin, super
}
```

### AI 和研究模型

#### Persona - AI 人设

```prisma
model Persona {
  id          Int                      @id
  name        String
  age         Int?
  gender      String?
  description String                   // 人设描述
  tier        Int                      // 质量层级 (0-3)
  locale      String?                  // 语言
  embedding   Unsupported("vector")?  // 768维向量（pgvector）
  score       Float?                   // 质量评分

  // 人设来源
  fromAnalystId    Int?
  fromInterviewId  Int?
}
```

**向量搜索**:

- 使用 pgvector 扩展
- 768 维嵌入向量
- 余弦相似度搜索

#### Analyst - 研究分析师 (Sage)

```prisma
model Analyst {
  id          Int           @id
  token       String        @unique // 唯一标识
  title       String        // 标题
  description String        // 描述
  kind        AnalystKind   // personal, insight, pro
  ownerId     Int
  owner       User

  // 研究内容
  studyKind   String?       // 研究类型
  studyPrompt String?       // 研究 Prompt
  studyResult String?       // 研究结果

  // 播客
  podcastScriptToken String?
  podcastAudioToken  String?
}
```

#### UserChat - 对话会话

```prisma
model UserChat {
  id       Int          @id
  token    String       @unique
  kind     UserChatKind // study, interview, persona, scout等
  userId   Int
  user     User

  messages ChatMessage[]

  // 关联到不同功能
  interviewSession InterviewSession?
  scoutTask        ScoutTask?
}
```

#### ChatMessage - 对话消息

```prisma
model ChatMessage {
  id         Int      @id
  messageId  String   @unique  // AI SDK 消息 ID
  userChatId Int
  userChat   UserChat
  role       String             // user, assistant, system
  parts      Json               // 消息部分（text, tool-call, tool-result）

  attachments ChatMessageAttachment[]
}
```

### 访谈系统

#### InterviewProject - 访谈项目

```prisma
model InterviewProject {
  id          Int       @id
  token       String    @unique
  title       String
  description String?
  instruction String?   // 访谈指令
  ownerId     Int
  owner       User

  // 配置
  questions   Json      // 访谈问题列表
  candidates  Json      // 候选受访人

  sessions    InterviewSession[]
}
```

#### InterviewSession - 访谈会话

```prisma
model InterviewSession {
  id                 Int               @id
  interviewProjectId Int
  project            InterviewProject
  personaId          Int
  persona            Persona           // 受访人设
  userChatId         Int               @unique
  userChat           UserChat          // 对话记录
  ongoing            Boolean           // 是否进行中
}
```

### Token 和订阅

#### TokensAccount - Token 账户

```prisma
model TokensAccount {
  id          Int   @id
  balance     BigInt // Token 余额
  // 个人或团队账户（互斥）
  userId      Int?  @unique
  user        User?
  teamId      Int?  @unique
  team        Team?

  monthlyLimit      BigInt? // 月度限额
  monthlyConsumed   BigInt? // 本月已消耗
  lastResetAt       DateTime? // 上次重置时间
}
```

#### TokensLog - Token 日志

```prisma
model TokensLog {
  id           Int              @id
  verb         TokensLogVerb    // signup, consume, subscription, gift
  value        BigInt           // Token 数量（消耗为负数）
  resourceType TokensLogResourceType?
  resourceId   Int?

  // 所属账户
  userId       Int?
  user         User?
  teamId       Int?
  team         Team?

  reportedBy   String?          // 报告者 (chat, api, admin)
  extra        Json             // 额外信息 (modelName, feature等)
}
```

#### Subscription - 订阅

```prisma
model Subscription {
  id       Int              @id
  plan     SubscriptionPlan // free, pro, max, super
  status   String           // active, canceled, expired

  // 订阅周期
  startAt  DateTime
  endAt    DateTime

  // 个人或团队订阅
  userId   Int?
  user     User?
  teamId   Int?
  team     Team?

  // Stripe 信息
  stripeSubscriptionId String?
  paymentRecordId      Int?
  paymentRecord        PaymentRecord?
}
```

#### PaymentRecord - 支付记录

```prisma
model PaymentRecord {
  id              Int       @id
  orderNo         String    @unique   // ATP + timestamp + random
  amount          Decimal   // 金额
  currency        String    // CNY, USD
  paymentMethod   String    // pingpp, stripe
  status          String    // pending, succeeded, failed
  paidAt          DateTime?

  // 支付提供商数据
  pingppCharge    Json?
  stripeInvoice   Json?

  userId          Int
  user            User
}
```

### Scout 用户发现

#### ScoutTask - Scout 任务

```prisma
model ScoutTask {
  id          Int      @id
  token       String   @unique
  title       String
  description String?
  userChatId  Int      @unique
  userChat    UserChat
  ownerId     Int
  owner       User

  // 发现的人设
  personas    Persona[]
}
```

### 其他模型

#### UserProfile - 用户资料

```prisma
model UserProfile {
  id       Int     @id
  userId   Int     @unique
  user     User
  avatar   String?
  bio      String?
  locale   String? // zh-CN, en-US
}
```

#### ChatMessageAttachment - 消息附件

```prisma
model ChatMessageAttachment {
  id            Int          @id
  chatMessageId Int
  chatMessage   ChatMessage
  name          String       // 文件名
  contentType   String       // MIME type
  url           String       // 文件 URL
  size          Int?         // 文件大小（字节）
}
```

## 数据关系图

```
User
  ├── TokensAccount (1:1)
  ├── UserChats (1:N)
  │   └── ChatMessages (1:N)
  │       └── Attachments (1:N)
  ├── Analysts (1:N)
  ├── Personas (1:N)
  ├── Subscriptions (1:N)
  │   └── PaymentRecord (1:1)
  ├── InterviewProjects (1:N)
  │   └── InterviewSessions (1:N)
  └── ScoutTasks (1:N)

Team
  ├── TokensAccount (1:1)
  ├── Members (1:N Users)
  ├── TeamConfigs (1:N)
  ├── ApiKeys (1:N)
  └── Subscriptions (1:N)
```

## 索引和性能

### 关键索引

```prisma
// 唯一索引
@@unique([teamId, key])  // TeamConfig
@@unique([userId, email]) // 用户查找

// 外键索引（自动创建）
// Prisma 自动为所有外键创建索引
```

### 向量搜索优化

```sql
-- pgvector 索引（手动创建）
CREATE INDEX persona_embedding_idx
ON "Persona" USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 查询示例

### 常用查询

详见：`scripts/utils/utility-sqls.sql`

**示例**:

```sql
-- 查询用户 token 余额
SELECT balance, monthlyLimit, monthlyConsumed
FROM "TokensAccount"
WHERE userId = $1;

-- 查询相似人设（向量搜索）
SELECT id, name, 1 - (embedding <=> $embedding) AS similarity
FROM "Persona"
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $embedding
LIMIT 10;

-- 查询订阅状态
SELECT plan, status, startAt, endAt
FROM "Subscription"
WHERE userId = $1 AND status = 'active'
ORDER BY endAt DESC
LIMIT 1;
```

## 迁移管理

### 执行迁移

```bash
# 生成 Prisma Client
npx prisma generate

# 开发环境迁移
npx prisma migrate dev

# 生产环境迁移
npx prisma migrate deploy
```

### 压缩迁移

详见：[如何压缩迁移](../../howto/how-to-squash-migrations.md)

## 最佳实践

### 1. 使用 Prisma Client

```typescript
import { prisma } from "@/prisma/prisma";

// ✅ 正确 - 使用单例
const user = await prisma.user.findUnique({ where: { id } });

// ❌ 错误 - 不要创建新实例
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

### 2. 类型导入

```typescript
// ✅ 正确 - 从自定义输出路径导入
import type { User, Persona } from "@/prisma/client";
import type { Prisma } from "@/prisma/client";

// ❌ 错误 - 不要从 @prisma/client 导入
import type { User } from "@prisma/client";
```

### 3. 事务处理

```typescript
await prisma.$transaction(async (tx) => {
  // 扣除 tokens
  await tx.tokensAccount.update({
    where: { userId },
    data: { balance: { decrement: cost } },
  });

  // 记录日志
  await tx.tokensLog.create({
    data: { userId, verb: "consume", value: -cost },
  });
});
```

### 4. 性能优化

```typescript
// ✅ 使用 select 减少数据传输
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});

// ✅ 使用 include 预加载关联
const chat = await prisma.userChat.findUnique({
  where: { token },
  include: { messages: true, user: true },
});
```

## 相关文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [数据库迁移指南](../../howto/how-to-squash-migrations.md)
- [PostgreSQL 安装](../../howto/setup-postgresql.md)

---

最后更新：2025-12
