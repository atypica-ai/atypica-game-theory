# 参考研究 + 文件附件

**一句话总结**：复用历史研究洞察（Reference Study）+ 上传文档/图片（File Attachments），让 AI 基于已有知识和材料深入研究，避免重复工作。

---

## 核心对比：有参考 vs 无参考

| 维度 | 参考研究 + 文件附件 | 从零开始 |
|------|------------------|---------|
| **知识复用** | ✅ 自动复用历史研究逻辑和洞察 | ❌ 每次重新分析 |
| **材料输入** | ✅ 上传文档/图片，AI 自动提取 | ⚠️ 只能文字描述 |
| **研究效率** | 快速（站在历史肩膀上） | 慢（从头分析） |
| **洞察深度** | 更深（对比趋势、识别模式） | 浅（单次分析） |
| **支持文件** | PDF, TXT, CSV, 图片 | 仅文字 |
| **文件处理** | 自动提取文本 + 压缩（≤20K tokens） | N/A |
| **典型用例** | 持续研究、趋势分析、文档分析 | 一次性探索 |

---

## 核心概念

### 1. Reference Study（参考研究）

**定义**：引用历史完成的研究，让 AI 复用已有的分析框架、洞察和结论。

**类比**：
- 像研究员在论文中引用文献
- 像产品经理参考上一版本的需求文档
- 像咨询顾问复用过往项目的分析框架

**存储内容**：`Analyst.studyLog`
```typescript
// prisma/schema.prisma:187-211
model Analyst {
  id           Int    @id
  userId       Int
  studyLog     String @default("") @db.Text  // 自动生成的研究日志
  // ... 其他字段
}
```

**studyLog 内容**：
- 研究目标和背景
- 使用的方法和工具
- 关键发现和洞察
- 结论和建议
- 约 5K-15K tokens

### 2. File Attachments（文件附件）

**定义**：上传文档或图片，AI 自动提取内容并融入研究。

**支持的文件类型**：
```typescript
// src/lib/attachments/processing.ts:21
const SUPPORTED_MIME_TYPES = [
  "application/pdf",   // PDF 文档
  "text/plain",        // 纯文本 (.txt)
  "text/csv",          // CSV 表格
  "image/jpeg",        // 图片（JPEG）
  "image/png",         // 图片（PNG）
  "image/webp",        // 图片（WebP）
  "image/gif",         // 图片（GIF）
];
```

**存储结构**：
```typescript
// prisma/schema.prisma:537-549
model AttachmentFile {
  id        Int    @id
  userId    Int
  user      User   @relation(...)
  name      String @db.VarChar(255)    // 原文件名
  mimeType  String @db.VarChar(255)     // MIME 类型
  size      Int                         // 文件大小（bytes）
  objectUrl String @unique @db.VarChar(255)  // S3 object URL
  extra     Json   @default("{}")      // 包含 compressedText 等

  createdAt DateTime
  updatedAt DateTime
}
```

**extra 字段内容**：
```typescript
type AttachmentFileExtra = {
  compressedText?: string;   // 压缩后的文本内容（≤20K tokens）
  processing?: {             // 处理状态
    startsAt: number;
  };
  error?: string;            // 错误信息
};
```

---

## Reference Study 详解

### 1. 引用方式

**在创建研究时选择**：
```typescript
// 用户创建研究时传入 referenceTokens
{
  brief: "分析 Q1 2026 的气泡水市场趋势",
  referenceTokens: ["abc123", "xyz789"],  // 之前完成的研究 token
}
```

**存储在 Analyst.extra**：
```typescript
type AnalystExtra = {
  referenceTokens?: string[];  // 引用的 UserChat tokens
};
```

### 2. 加载和注入流程

```typescript
// src/app/(study)/agents/referenceContext.ts:8-68
export async function buildReferenceStudyContext({
  referenceTokens,
  userId,
  locale,
}: {
  referenceTokens: string[];
  userId: number;
  locale: Locale;
}): Promise<string | null> {
  // 1. 查询引用的研究
  const referenceChats = await prisma.userChat.findMany({
    where: {
      token: { in: referenceTokens },
      userId,
      kind: "study",  // 只支持研究类型
    },
    include: {
      analyst: {
        select: { studyLog: true },
      },
    },
  });

  // 2. 过滤有 studyLog 的研究
  const validReferenceChats = referenceChats.filter((chat) => chat.analyst?.studyLog);

  if (validReferenceChats.length === 0) {
    return null;
  }

  // 3. 格式化为结构化消息
  const formatStudySection = (chat, index) => {
    const num = index + 1;
    return locale === "zh-CN"
      ? `<参考研究_${num}>
<标题>${chat.title}</标题>
<研究日志>${chat.analyst!.studyLog}</研究日志>
</参考研究_${num}>`
      : `<reference_study_${num}>
<title>${chat.title}</title>
<study_log>${chat.analyst!.studyLog}</study_log>
</reference_study_${num}>`;
  };

  const studySections = validReferenceChats.map(formatStudySection).join("\n\n");

  // 4. 添加引导语
  return locale === "zh-CN"
    ? `我之前已经完成了一些相关研究，现在想基于这些研究结果继续深入探索。请你先仔细阅读下面我提供的参考研究内容，然后在接下来的研究中充分利用这些已有的发现和洞察。

${studySections}

好的，现在你已经了解了这些参考研究的背景，接下来我会告诉你新的研究问题。`
    : `I have previously completed some related research and now want to continue exploring based on these findings...`;
}
```

### 3. 注入时机

```typescript
// src/app/(study)/agents/baseAgentRequest.ts:290-318
// Phase 5: Universal Reference Study Context

const referenceTokens = (analystExtra as AnalystExtra).referenceTokens;
if (referenceTokens && referenceTokens.length > 0) {
  const referenceStudyContext = await buildReferenceStudyContext({
    referenceTokens,
    userId,
    locale,
  });

  if (referenceStudyContext) {
    // 注入为第一条 user message（在 memory 之后，用户消息之前）
    modelMessages = [
      {
        role: "user",
        content: referenceStudyContext,
      },
      ...modelMessages,
    ];
  }
}
```

**关键设计**：
- 注入为 **user message**（不是 system prompt）
- 放在消息流最前面（在用户新问题之前）
- 包含结构化标签（`<参考研究_N>`），便于 AI 识别和引用

### 4. 使用示例

**场景：持续研究气泡水市场**

**研究 1（2025-10-15）**：
```
用户: 研究气泡水市场的目标客群和核心需求

AI 完成研究后生成 studyLog:
- 目标客群: 25-35岁都市白领，关注健康
- 核心需求: 0糖0卡，口感丰富，便携
- 价格敏感度: 中等（5-8元/瓶可接受）
- 主要场景: 办公室、健身后、聚会
```

**研究 2（2026-01-10，引用研究 1）**：
```
用户: 分析 Q4 2025 气泡水销售数据，看看趋势如何
Reference: [研究 1 的 token]

AI 收到的 context:
<参考研究_1>
<标题>气泡水市场的目标客群和核心需求</标题>
<研究日志>
- 目标客群: 25-35岁都市白领，关注健康
- 核心需求: 0糖0卡，口感丰富，便携
...
</研究日志>
</参考研究_1>

现在分析 Q4 2025 气泡水销售数据，看看趋势如何

AI 分析:
基于你之前的研究，我们知道目标客群是 25-35 岁都市白领，核心需求是 0 糖 0 卡...
现在让我分析 Q4 销售数据，看看是否符合这些特征：

1. 销售额增长 35%，主要来自办公室场景（+45%）
2. 0 糖产品占比从 60% 上升到 78%，验证了之前的需求洞察
3. 价格区间集中在 6-7 元，与之前的价格敏感度一致
4. 新兴趋势: 健身后场景增长 60%，超出预期
```

**价值**：
- AI 自动复用之前的客群画像和需求分析
- 对比趋势变化（0糖产品占比上升）
- 识别新兴趋势（健身后场景增长）
- 节省重复分析时间

---

## File Attachments 详解

### 1. 上传和存储

**上传流程**：
```
用户上传文件
    ↓
上传到 S3
    ↓
创建 AttachmentFile 记录
    ↓
关联到 Analyst.attachments
```

**Analyst.attachments 字段**：
```typescript
// prisma/schema.prisma:198
attachments Json @default("[]")

// 类型定义
type ChatMessageAttachment = {
  objectUrl: string;  // S3 object URL
};

// 示例
[
  { "objectUrl": "uploads/user123/file1.pdf" },
  { "objectUrl": "uploads/user123/image1.png" }
]
```

### 2. 文件处理流程

#### 2.1 检测处理状态

```typescript
// src/app/(study)/agents/utils.ts:156-213
export async function waitUntilAttachmentsProcessed({
  analyst,
  locale,
  streamWriter,
  streamingMessage,
}: ...): Promise<
  ({ type: "image"; mimeType: string; dataUrl: string } | { type: "text"; text: string })[]
> {
  // 1. 获取所有附件
  const analystAttachments = (analyst.attachments ?? []) as ChatMessageAttachment[];

  if (!analystAttachments.length) {
    return [];
  }

  // 2. 查询 AttachmentFile 记录
  const attachmentFiles = await prisma.attachmentFile.findMany({
    where: {
      userId: analyst.userId,
      objectUrl: { in: analystAttachments.map((a) => a.objectUrl) },
    },
  });

  // 3. 检查是否所有文件都已处理
  const SUPPORTED_MIME_TYPES = ["application/pdf", "text/plain", "text/csv"];
  const allFilesReady = attachmentFiles.every((file) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) return true; // 图片跳过
    if (file.extra.compressedText) return true;  // 已压缩
    if (file.extra.error) return true;  // 处理失败
    return false;  // 需要处理
  });

  if (allFilesReady) {
    // 所有文件已处理，直接返回
    return await Promise.all(
      attachmentFiles.map(async ({ objectUrl, mimeType, extra }) => {
        if (mimeType.startsWith("image/")) {
          return {
            type: "image",
            mimeType,
            dataUrl: await fileUrlToDataUrl({ objectUrl, mimeType }),
          };
        } else {
          return { type: "text", text: extra.compressedText ?? "[EMPTY]" };
        }
      }),
    );
  }

  // 4. 有文件需要处理，等待处理完成
  // ... (见下一节)
}
```

#### 2.2 实时处理和反馈

```typescript
// src/app/(study)/agents/utils.ts:215-274
// 创建处理流
const promise = new Promise<void>((resolve, reject) => {
  const stream = createUIMessageStream({
    generateId: () => streamingMessage.id,  // 固定 messageId，合并到当前消息
    async execute({ writer }) {
      const partId = "processing-attachments-text-part";
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ id: partId, type: "text-start" });

      // 显示处理中提示
      writer.write({
        id: partId,
        type: "text-delta",
        delta: locale === "zh-CN"
          ? "正在处理附件，请稍候...\n"
          : "Processing attachments, please wait...\n",
      });
      writer.write({
        id: partId,
        type: "text-delta",
        delta: attachmentFiles.map((file) => `${file.name}\n`).join(""),
      });

      // 并行处理所有文件
      try {
        await Promise.all(attachmentFiles.map((file) => parseAttachmentText(file.id)));

        await new Promise((resolve) => setTimeout(resolve, 3000));  // 等待 3 秒

        writer.write({
          id: partId,
          type: "text-delta",
          delta: locale === "zh-CN"
            ? "附件处理完毕，可以继续对话了。"
            : "Attachment processing completed...",
        });
        writer.write({ id: partId, type: "text-end" });
        writer.write({ type: "finish-step" });
        resolve();
      } catch (error) {
        writer.write({
          id: partId,
          type: "text-delta",
          delta: locale === "zh-CN"
            ? `附件处理失败：${(error as Error).message}`
            : `Attachment processing failed: ${(error as Error).message}`,
        });
        writer.write({ id: partId, type: "text-end" });
        writer.write({ type: "finish-step" });
        reject(error);
      }
    },
  });

  streamWriter.merge(stream);
});

// 等待处理完成
await promise;
```

**用户体验**：
```
用户发送消息（带附件）
    ↓
显示: "正在处理附件，请稍候...
        研究报告.pdf
        数据表.csv"
    ↓
（后台处理 3-30 秒）
    ↓
显示: "附件处理完毕，可以继续对话了。"
    ↓
AI 开始回复
```

#### 2.3 文本提取和压缩

```typescript
// src/lib/attachments/processing.ts:57-74
async function extractFullText(file: AttachmentFileWithTypedExtra): Promise<string> {
  const { mimeType, objectUrl, name } = file;

  // PDF: 使用 PDFjs
  if (mimeType === "application/pdf") {
    return await parsePDFToText({ name, objectUrl, mimeType });
  }

  // TXT/CSV: 直接读取
  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const fileUrl = await s3SignedUrl(objectUrl);
    const response = await proxiedFetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.text();
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}
```

```typescript
// src/lib/attachments/processing.ts:76-165
export async function compressText({
  fullText,
  logger,
  abortSignal,
}: ...): Promise<string> {
  const locale = await detectInputLanguage({ text: fullText });

  const systemPrompt = locale === "zh-CN"
    ? `你是一位专业的信息压缩专家。你的任务是压缩文档，而非总结文档。

核心原则：
- 这是信息压缩，不是总结或提炼
- 保持原文的所有信息和意思，不要抽象化或提炼洞察
- 能合并的句子就合并，能简化的表达就简化
- 删除冗余的修饰词、重复表述、无意义的连接词
- 使用紧凑格式：分号连接、缩写、去掉不必要的词
- 保留所有具体的事实、数据、实体、观点和关系
- 目标：<20,000 tokens（约 60,000 字符）

重要：不要改变原文的意思，不要添加原文没有的推断或洞察。

输出格式：直接输出压缩后的文本内容，不要任何解释。`
    : `You are an expert information compression specialist...`;

  const messages = locale === "zh-CN"
    ? [
        { role: "user" as const, content: "以下是需要压缩的文本原文：" },
        { role: "user" as const, content: fullText },
        { role: "user" as const, content: "直接输出所有压缩后的文本内容，不要任何解释。" },
      ]
    : [ ... ];

  // 使用 gpt-5-mini 压缩
  const response = streamText({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      },
    },
    system: systemPrompt,
    messages,
    maxOutputTokens: 20_000,  // 最多输出 20K tokens
    abortSignal,
  });

  // 流式读取压缩后的文本
  let compressedText = "";
  response.onChunk(({ chunk }) => {
    if (chunk.type === "text-delta") {
      compressedText += chunk.text;
    }
  });

  await response.consumeStream();

  return compressedText;
}
```

**关键设计**：
- **模型**：`gpt-5-mini`（推理功能，压缩效果好）
- **压缩目标**：≤20K tokens（约 60K 字符）
- **压缩原则**：保留所有信息，不提炼洞察（这是压缩，不是总结）
- **流式处理**：边压缩边读取，节省内存

**压缩示例**：

**原文**（5000 字）：
```
在当前的市场环境下，气泡水产品正在经历一个快速增长的阶段。根据我们的市场调研发现，消费者对于气泡水的需求主要集中在以下几个方面...（冗长描述）
```

**压缩后**（1500 字）：
```
气泡水市场快速增长。消费者需求：0糖0卡（78%提及）；口感丰富（65%）；便携（52%）。目标客群：25-35岁都市白领；关注健康。价格敏感度中等（5-8元/瓶可接受）。主要场景：办公室（45%）、健身后（30%）、聚会（25%）...
```

**压缩率**：约 70%（5000 字 → 1500 字）

### 3. 注入时机

```typescript
// src/app/(study)/agents/baseAgentRequest.ts:178-188
// Phase 3: Universal Attachment Processing

// Process attachments if analyst is provided (universal for all agents)
const parsedAttachments = analyst
  ? await waitUntilAttachmentsProcessed({
      analyst,
      locale,
      streamWriter,
      streamingMessage,
    })
  : [];
```

**注入方式**：
```typescript
// 将 parsed attachments 注入到第一条 user message 的 parts
const firstUserMessage = modelMessages.find((msg) => msg.role === "user");
if (firstUserMessage && parsedAttachments.length > 0) {
  firstUserMessage.parts = [
    ...parsedAttachments.map((attachment) => {
      if (attachment.type === "image") {
        return {
          type: "image" as const,
          mimeType: attachment.mimeType,
          dataUrl: attachment.dataUrl,
        };
      } else {
        return {
          type: "text" as const,
          text: `<附件内容>\n${attachment.text}\n</附件内容>`,
        };
      }
    }),
    ...firstUserMessage.parts,
  ];
}
```

**关键设计**：
- 注入到第一条 **user message 的 parts**（不是单独的消息）
- 图片：直接注入为 `ImagePart`（dataUrl 格式）
- 文本：包裹在 `<附件内容>` 标签中

### 4. 使用示例

**场景：分析竞品报告**

**步骤 1：上传文件**
```
用户: 帮我分析这份竞品研究报告，看看他们的优势和劣势
附件: 竞品研究报告.pdf (15 页, 3MB)
```

**步骤 2：自动处理**
```
系统: 正在处理附件，请稍候...
      竞品研究报告.pdf

（后台执行）:
1. 下载 PDF from S3
2. 提取文本 (parsePDFToText) → 约 25,000 字
3. 压缩文本 (compressText with gpt-5-mini) → 约 8,000 字
4. 保存到 AttachmentFile.extra.compressedText

系统: 附件处理完毕，可以继续对话了。
```

**步骤 3：AI 分析**
```
AI 收到的 context:
<附件内容>
竞品A定位高端市场;主打0糖0卡+天然果汁;价格8-12元/瓶;目标客群25-40岁中高收入;核心优势：口感丰富,果汁含量10%;品牌溢价强;主要渠道：便利店(60%),电商(30%),商超(10%)...
</附件内容>

帮我分析这份竞品研究报告，看看他们的优势和劣势

AI 分析:
我已经阅读了竞品A的研究报告。以下是分析：

**优势**:
1. 产品定位清晰：高端市场，0糖0卡+天然果汁（含量10%）
2. 品牌溢价能力强：价格8-12元/瓶，高于行业平均（5-8元）
3. 渠道布局合理：便利店占比60%，契合都市白领消费场景
4. 目标客群精准：25-40岁中高收入人群

**劣势**:
1. 价格偏高，可能限制市场规模（价格敏感客群流失）
2. 电商渠道占比仅30%，未充分利用线上增长红利
3. 果汁含量10%可能导致成本压力，影响毛利率
4. 品牌溢价依赖较强，需持续营销投入

**建议**:
如果你想对标竞品A，可以考虑...
```

**价值**：
- 无需手动复制粘贴报告内容
- AI 自动提取关键信息（产品定位、价格、渠道、客群）
- 结构化分析（优势/劣势/建议）
- 节省大量人工整理时间

---

## 两者协同使用

### 场景：持续市场研究 + 竞品报告分析

**研究 1（2025-10）**：气泡水市场基础研究
```
用户: 研究气泡水市场的目标客群和核心需求

AI 完成研究，生成 studyLog
```

**研究 2（2025-12）**：引用研究 1 + 上传竞品报告
```
用户: 基于之前的气泡水研究，分析这份竞品报告
Reference: [研究 1]
Attachments: [竞品研究报告.pdf]

AI 收到的 context:
1. Reference Study (历史研究)
   <参考研究_1>
   ...气泡水客群和需求...
   </参考研究_1>

2. File Attachments (竞品报告)
   <附件内容>
   ...竞品A定位、价格、渠道...
   </附件内容>

AI 分析:
结合你之前对气泡水市场的研究，我来分析竞品A：

**与市场需求的契合度**:
- 你之前发现核心需求是"0糖0卡"，竞品A满足 ✅
- 你之前发现价格敏感度中等（5-8元），竞品A定价8-12元偏高 ⚠️
- 你之前发现主要场景是办公室，竞品A在便利店渠道占比60% ✅

**竞争优势**:
竞品A的果汁含量10%是差异化优势，但你之前的研究中，"口感丰富"需求仅占65%，不是主流需求...

**建议**:
1. 价格定位: 建议5-7元区间，覆盖你之前研究的主流客群
2. 产品差异化: 考虑0糖0卡+气泡感（而非果汁），更符合健康需求
3. 渠道策略: 重点布局办公楼宇便利店（契合主要场景）
```

**协同价值**：
- Reference Study 提供基础洞察（客群、需求、价格敏感度）
- File Attachments 提供外部信息（竞品数据）
- AI 自动对比分析，识别机会点

---

## 10 个常见问题

### 1. Reference Study 和 Chat History 有什么区别？

| 维度 | Reference Study | Chat History |
|------|----------------|-------------|
| **内容** | studyLog（研究日志） | 完整对话消息 |
| **粒度** | 精炼的洞察和结论 | 原始问答 |
| **用途** | 跨研究复用知识 | 单次对话上下文 |
| **生命周期** | 永久保存 | 仅当前对话 |
| **引用方式** | 明确指定 tokens | 自动加载 |

**类比**：
- **Reference Study**：论文的文献综述（精炼的知识）
- **Chat History**：对话录音（原始记录）

### 2. 支持哪些类型的文件？

**文本文件**（会被提取和压缩）：
- ✅ PDF (`.pdf`)
- ✅ 纯文本 (`.txt`)
- ✅ CSV 表格 (`.csv`)

**图片文件**（直接注入，不压缩）：
- ✅ JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ WebP (`.webp`)
- ✅ GIF (`.gif`)

**暂不支持**：
- ❌ Word文档 (`.doc`, `.docx`)
- ❌ Excel 表格 (`.xls`, `.xlsx`)
- ❌ PowerPoint (`.ppt`, `.pptx`)
- ❌ 视频、音频

**未来计划**：
- Word/Excel/PowerPoint → 转换为 PDF 后处理
- 表格数据 → 结构化提取（保留表格格式）

### 3. 文件大小有限制吗？

**当前限制**：
- **上传大小**：最大 10MB per file
- **处理后大小**：压缩到 ≤20K tokens（约 60K 字符）

**实际处理能力**：
| 文件类型 | 原始大小 | 压缩后 | 处理时间 |
|---------|---------|-------|---------|
| PDF (10 页) | 2MB | 5K tokens | 5-10 秒 |
| PDF (50 页) | 10MB | 18K tokens | 15-30 秒 |
| TXT (5万字) | 100KB | 8K tokens | 3-5 秒 |
| CSV (1万行) | 500KB | 12K tokens | 10-15 秒 |

**如果超过 20K tokens**：
- 系统会尽量压缩到 20K tokens
- 优先保留关键信息（数据、事实、观点）
- 删除冗余和重复内容

### 4. 为什么要压缩文件，不能直接全文输入？

**原因**：

1. **Context Window 限制**：
   - LLM 的 context window 有限（claude-sonnet-4-5 约 200K tokens）
   - 一份 50 页 PDF 可能消耗 50K+ tokens
   - 如果多个文件，容易超限

2. **成本控制**：
   - Input tokens 计费
   - 50K tokens vs 20K tokens，成本差 2.5 倍

3. **质量提升**：
   - 过多冗余信息会干扰 LLM 判断
   - 压缩后的精炼信息更易理解和引用

**压缩策略**：
- **不是总结**：保留所有信息，不提炼洞察
- **信息压缩**：删除冗余、合并句子、紧凑格式
- **保留关键**：数据、事实、实体、观点、关系

### 5. 图片如何处理？

**处理方式**：
- **不压缩**：图片直接转换为 dataUrl 注入
- **Vision API**：使用 claude-sonnet 的 vision 能力识别

**支持的图片用途**：
- 截图（UI界面、数据图表）
- 照片（产品、场景、人物）
- 设计稿（mockup、wireframe）
- 图表（柱状图、折线图、饼图）

**示例**：
```
用户: 分析这个竞品的产品详情页设计
附件: 产品详情页截图.png

AI 分析:
我看到这个产品详情页的设计：

**布局**:
- 顶部：大图轮播（占屏幕60%）
- 中部：产品标题、价格、优惠信息
- 底部：产品参数、详情描述

**设计特点**:
- 使用了清新的绿色主色调，契合健康定位
- 价格突出显示，字号是标题的1.5倍
- 优惠标签（-20%）使用红色，吸引注意力

**建议**:
1. 图片轮播可以减少到3-5张，加快加载速度
2. 价格和优惠可以整合，避免信息过于分散
3. 参数部分可以用图标化展示，更直观
```

### 6. 文件处理失败怎么办？

**常见失败原因**：
1. **PDF 损坏或加密**：无法提取文本
2. **文件过大**：超过 10MB
3. **网络问题**：S3 下载失败
4. **格式不支持**：非 PDF/TXT/CSV

**失败处理**：
```typescript
// 失败信息存储在 AttachmentFile.extra.error
{
  error: "Failed to extract text from PDF: File is encrypted"
}
```

**用户看到的提示**：
```
附件处理失败：文件已加密，无法提取文本

建议:
- 解除 PDF 加密后重新上传
- 或者将内容复制粘贴到消息中
```

**降级方案**：
- 处理失败的文件会被跳过
- 不影响其他文件和对话
- 用户可以手动复制粘贴内容

### 7. Reference Study 可以引用多少个？

**推荐数量**：1-3 个

**原因**：
- 每个 studyLog 约 5K-15K tokens
- 3 个 studyLog 约 15K-45K tokens
- 过多会挤占 context window

**实际限制**：
- 技术上无硬性限制
- 但超过 5 个会显著影响性能

**最佳实践**：
- **1 个**：延续单个研究（如月度复盘）
- **2-3 个**：综合多个视角（如竞品对比）
- **不要超过 5 个**：信息过载，AI 难以综合

### 8. 文件附件和 Reference Study 的成本如何？

**Reference Study**：
- **存储**：免费（存储在 Analyst.studyLog）
- **使用**：仅消耗 input tokens
  - 每个 studyLog 约 5K-15K tokens
  - 成本：约 $0.003 - $0.015 per reference

**File Attachments**：
- **存储**：S3 存储费用（约 $0.023/GB/月）
  - 10 个文件（每个 2MB）= 20MB ≈ $0.0005/月
- **处理**：
  - 提取文本：免费（PDFjs）
  - 压缩文本：gpt-5-mini (10K-50K tokens) ≈ $0.005 - $0.025 per file
- **使用**：消耗 input tokens
  - 压缩后 5K-20K tokens
  - 成本：约 $0.005 - $0.020 per file per use

**典型场景成本**：
```
用户: 基于上次研究（1个 reference）+ 分析竞品报告（1个 PDF）

成本分解:
- Reference Study: 10K tokens × $0.003/K = $0.03
- File Processing: 压缩 20K tokens × $0.005/K = $0.10
- File Usage: 15K tokens × $0.001/K = $0.015
- AI 分析: 50K output tokens × $0.015/K = $0.75

总成本: ~$0.895
```

**对比**：
- 不用 reference + attachment：$0.50（仅 AI 分析）
- 用 reference + attachment：$0.90（多 $0.40，但节省人工整理时间）

### 9. studyLog 是如何生成的？

**生成时机**：研究完成后，自动生成

**生成流程**：
```typescript
// src/app/(study)/agents/studyLog/index.ts
export async function generateStudyLog({
  studyUserChatId,
  userId,
  locale,
  logger,
}: ...): Promise<void> {
  // 1. 获取对话消息
  const messages = await prisma.chatMessage.findMany({
    where: { userChatId: studyUserChatId },
    orderBy: { id: "asc" },
  });

  // 2. 过滤出用户消息（排除工具调用消息）
  const filteredMessages = messages.filter(
    (msg) => msg.role === "user" && !hasToolParts(msg)
  );

  // 3. 使用 LLM 生成研究日志
  const result = await generateText({
    model: llm("claude-haiku-4-5"),
    system: studyLogSystemPrompt({ locale }),
    messages: [
      ...filteredMessages,
      {
        role: "assistant",
        content: [
          { type: "text", text: "Study Log Generated" },
          { type: "text", text: studyLog },  // 之前生成的报告/播客
        ],
      },
    ],
    maxRetries: 3,
  });

  // 4. 保存到 Analyst.studyLog
  await prisma.analyst.update({
    where: { id: analystId },
    data: { studyLog: result.text },
  });
}
```

**studyLog 内容结构**（系统提示词定义）：
```
# 研究目标
[用户的研究问题和背景]

# 研究方法
[使用的工具和方法: interviewChat, discussionChat, webSearch, etc.]

# 关键发现
## 发现1: [标题]
[详细描述，包含数据和案例]

## 发现2: [标题]
...

# 结论和建议
[核心洞察和可操作建议]
```

**关键设计**：
- 使用 `claude-haiku-4-5`（快速、成本低）
- 输入：用户消息 + 生成的报告/播客
- 输出：结构化的研究日志（5K-15K tokens）

### 10. 如何优化 Reference + Attachments 的使用？

**最佳实践**：

1. **Reference Study 选择**：
   - ✅ 选择最相关的 1-3 个研究
   - ✅ 优先选择结论明确、数据丰富的研究
   - ❌ 不要引用过于陈旧的研究（> 6 个月）

2. **File Attachments 优化**：
   - ✅ 上传前检查文件质量（清晰、完整）
   - ✅ 单个文件 < 10MB，尽量 < 5MB
   - ✅ 多个小文件优于一个大文件
   - ❌ 不要上传重复或冗余内容

3. **协同使用**：
   - ✅ Reference 提供内部洞察，Attachments 补充外部信息
   - ✅ 先 Reference（历史基础），后 Attachments（新材料）
   - ✅ 明确告诉 AI 如何结合两者（"基于之前研究，分析新报告"）

4. **成本优化**：
   - ✅ 复用 Reference Study（已压缩，成本低）
   - ✅ 批量处理 Attachments（一次处理，多次使用）
   - ⚠️ 避免每次都上传同一文件

**示例：高效工作流**

**Month 1**：
```
研究气泡水市场基础
→ 生成 studyLog (token: abc123)
```

**Month 2**：
```
基于 Month 1 研究 (reference: abc123) + 竞品报告 A (attachment)
→ 生成 studyLog (token: def456)
```

**Month 3**：
```
基于 Month 2 研究 (reference: def456) + Q2 销售数据 (attachment)
→ 生成 studyLog (token: ghi789)
```

**价值**：
- 每月累积洞察
- 无需重复分析基础问题
- 形成持续演进的知识体系

---

## 总结：Reference + Attachments 的价值

### 核心优势

1. **知识复用**：站在历史肩膀上，不重复劳动
2. **材料输入**：上传文档/图片，AI 自动提取和分析
3. **持续研究**：形成演进的知识体系
4. **效率提升**：节省人工整理和复制粘贴时间
5. **洞察深度**：对比趋势、识别模式、综合分析

### 适用场景

- **持续研究**：月度复盘、季度总结、年度趋势
- **竞品分析**：历史洞察 + 新竞品报告
- **文档分析**：研究报告、行业白皮书、数据表格
- **趋势对比**：历史数据 + 最新数据

### 技术亮点

- **studyLog 自动生成**：claude-haiku-4-5 提取研究精华
- **文本智能压缩**：gpt-5-mini 保留信息，删除冗余（≤20K tokens）
- **实时处理反馈**：流式显示处理进度，体验流畅
- **多模态支持**：文本 + 图片，vision API 识别
- **并行处理**：多个文件同时处理，节省等待时间

### 代码位置总结

| 功能 | 文件路径 |
|------|---------|
| **Reference Context** | `src/app/(study)/agents/referenceContext.ts` |
| **Attachment Processing** | `src/lib/attachments/processing.ts` |
| **Attachment Utils** | `src/app/(study)/agents/utils.ts:156-306` |
| **studyLog Generation** | `src/app/(study)/agents/studyLog/index.ts` |
| **Integration (baseAgentRequest)** | `src/app/(study)/agents/baseAgentRequest.ts:178-318` |
| **Database Schema (Analyst)** | `prisma/schema.prisma:187-211` |
| **Database Schema (AttachmentFile)** | `prisma/schema.prisma:537-549` |

---

**Reference Study + File Attachments 让 AI 研究不再从零开始，而是持续演进、越来越深入。**
