# 参考研究 + 文件附件 - 让 AI 站在你的肩膀上

## 核心理念

atypica.AI 不是孤立的研究工具，而是一个**持续积累、逐步深化**的研究平台。通过**参考研究**和**文件附件**两大功能，AI 能够：

1. **参考研究**：基于你之前的研究结果继续深入，避免重复调研
2. **文件附件**：理解你上传的图片和文档，结合已有资料进行分析

这两个功能让 AI 真正"站在你的肩膀上"，而不是每次从零开始。

---

## 对比总览：有 vs 无 参考研究+文件附件

| **场景** | **无参考研究/文件附件** | **有参考研究/文件附件** |
|---------|------------------------|------------------------|
| **研究连续性** | 每次研究从零开始，AI 不记得之前的发现 | AI 自动加载之前的研究日志，延续上下文 |
| **资料利用** | 需要手动复制粘贴文档内容（受限于输入框长度） | 直接上传 PDF/图片，AI 自动提取和理解 |
| **研究深度** | 浅层分析（每次重新调研基础信息） | 深度分析（基于已有发现，快速进入核心问题） |
| **时间效率** | 慢（重复调研 + 手动整理资料） | 快（自动加载背景 + 自动处理文件） |
| **知识积累** | 孤立的研究报告（无法复用） | 可复用的研究资产（研究 A → 研究 B → 研究 C） |

### 真实案例对比

**场景**：研究"2025 年新能源汽车市场趋势"

**无参考研究/文件附件**（30 分钟）：
```
用户："帮我研究 2025 年新能源汽车市场趋势"

AI：开始 webSearch，收集基础信息...
   → 发现：市场规模、主要玩家、政策环境
   → 10 分钟后，生成报告

用户："能再深入分析一下用户痛点吗？"

AI：重新 webSearch，再次收集基础信息...
   → 又花 10 分钟重复调研市场背景
   → 再花 10 分钟分析痛点
```

**有参考研究/文件附件**（10 分钟）：
```
用户："帮我研究 2025 年新能源汽车市场趋势"

AI：开始研究...
   → 10 分钟后，生成报告（研究 A）

用户："能基于这个研究，深入分析一下用户痛点吗？我还上传了 2 份行业报告。"
   [参考研究：研究 A]
   [附件：麦肯锡报告.pdf, 艾瑞报告.pdf]

AI：加载研究 A 的日志 + 提取 PDF 内容
   → 已知：市场规模、主要玩家、政策环境（无需重复调研）
   → 直接进入痛点分析 + 结合上传的报告
   → 5 分钟生成深度分析
```

**效率提升**：
- **时间**：30 分钟 → 15 分钟（节省 50%）
- **深度**：浅层分析 → 深度分析（基于已有发现）
- **资料利用**：手动复制粘贴 → 自动提取理解

---

## 功能 1：参考研究（Reference Research）

### 核心理念

参考研究让 AI 能够"记住"你之前的研究成果，并在新研究中**自动加载和利用**这些背景知识。

**类比**：
- **传统方式**：每次写论文都要从第一章开始写，重复介绍背景
- **参考研究**：直接引用之前的章节，快速进入核心论证

### 工作原理

#### 1. 研究日志自动生成

每次研究完成后，atypica.AI 会自动生成 `studyLog`（研究日志）：

**数据来源**：
```typescript
// src/app/(study)/agents/studyLog.ts
export async function generateAndSaveStudyLog({
  analyst,
  messages,
  locale,
}) {
  // 从对话消息自动提取研究过程
  const studyLog = await extractStudyLogFromMessages(messages);

  // 保存到 Analyst.studyLog
  await prisma.analyst.update({
    where: { id: analyst.id },
    data: { studyLog },
  });

  return { studyLog };
}
```

**studyLog 内容**：
```markdown
# 研究日志

## 研究主题
2025 年新能源汽车市场趋势

## 研究过程
1. 市场规模分析
   - 2025 年预计达到 800 万辆（同比增长 35%）
   - 渗透率达到 45%（vs 2024 年的 32%）

2. 主要玩家
   - 特斯拉：市场份额 18%
   - 比亚迪：市场份额 22%
   - 蔚来：市场份额 8%

3. 政策环境
   - 补贴政策延续至 2027 年
   - 充电桩建设目标：500 万个

## 核心发现
- 发现 1：高端市场增长放缓，中低端市场爆发
- 发现 2：续航焦虑仍是首要痛点（63% 用户提及）
- 发现 3：智能化成为新竞争点（自动驾驶、车机系统）
```

---

#### 2. 参考研究引用

在新研究中，用户可以引用之前的研究：

**前端操作**：
```typescript
// 用户在创建新研究时选择"参考研究"
const referenceTokens = ["abc123", "def456"]; // 之前研究的 token

// 传递给后端
await createStudyChat({
  brief: "深入分析新能源汽车用户痛点",
  referenceTokens, // 引用之前的研究
});
```

**后端处理**：
```typescript
// src/app/(study)/agents/referenceContext.ts
export async function buildReferenceStudyContext({
  referenceTokens,
  userId,
  locale,
}) {
  // 查询引用的研究
  const referenceChats = await prisma.userChat.findMany({
    where: {
      token: { in: referenceTokens },
      userId,
      kind: "study",
    },
    include: {
      analyst: {
        select: {
          studyLog: true, // 加载研究日志
        },
      },
    },
  });

  // 构建参考研究背景消息
  const studySections = referenceChats.map((chat, index) => {
    return `<参考研究_${index + 1}>
<标题>${chat.title}</标题>
<研究日志>${chat.analyst.studyLog}</研究日志>
</参考研究_${index + 1}>`;
  }).join("\n\n");

  return `我之前已经完成了一些相关研究，现在想基于这些研究结果继续深入探索。请你先仔细阅读下面我提供的参考研究内容，然后在接下来的研究中充分利用这些已有的发现和洞察。

${studySections}

好的，现在你已经了解了这些参考研究的背景，接下来我会告诉你新的研究问题。`;
}
```

---

#### 3. AI 如何利用参考研究

参考研究内容会作为第一条用户消息注入到对话中：

**消息结构**：
```typescript
const messages = [
  // 第 1 条消息：参考研究背景
  {
    role: "user",
    content: `我之前已经完成了一些相关研究...

<参考研究_1>
<标题>2025 年新能源汽车市场趋势</标题>
<研究日志>
# 研究日志
## 研究主题
...
## 核心发现
- 发现 1：高端市场增长放缓，中低端市场爆发
- 发现 2：续航焦虑仍是首要痛点（63% 用户提及）
...
</研究日志>
</参考研究_1>

好的，现在你已经了解了这些参考研究的背景，接下来我会告诉你新的研究问题。`
  },

  // 第 2 条消息：新的研究问题
  {
    role: "user",
    content: "深入分析新能源汽车用户痛点，特别是续航焦虑的真实原因"
  },

  // AI 开始研究...
];
```

**AI 的研究策略**：
```
Plan Mode Agent 分析：
✅ 已知背景（从参考研究）：
   - 市场规模：800 万辆（2025）
   - 渗透率：45%
   - 主要玩家：特斯拉 18%、比亚迪 22%
   - 核心痛点：续航焦虑（63% 用户提及）

❓ 新研究焦点：
   - 为什么 63% 用户有续航焦虑？
   - 真实原因是什么？（技术？心理？场景？）
   - 如何解决？

研究计划：
1. ❌ 跳过市场背景调研（已知）
2. ✅ 直接调研续航焦虑的深层原因
3. ✅ 使用 scoutTaskChat 观察社交媒体讨论
4. ✅ 使用 interviewChat 深度访谈 10 位用户
```

**关键优势**：
- **避免重复调研**：AI 已知市场背景，无需重新 webSearch
- **快速进入核心**：直接从之前的发现（续航焦虑 63%）开始深入
- **上下文连贯**：新研究是旧研究的自然延续

---

### 适用场景

#### ✅ 适合使用参考研究

**1. 渐进式深入研究**
```
研究 A：2025 年新能源汽车市场趋势（宏观）
   ↓
研究 B：新能源汽车用户痛点深度分析（引用研究 A）
   ↓
研究 C：解决续航焦虑的产品方案设计（引用研究 A + B）
```

**2. 跨时间对比研究**
```
研究 A：2024 Q4 消费趋势（2024 年 12 月）
   ↓
研究 B：2025 Q1 消费趋势对比（2025 年 3 月，引用研究 A）
   → AI 自动对比 Q4 vs Q1 的变化
```

**3. 多维度分析**
```
研究 A：产品功能分析
研究 B：用户痛点分析
   ↓
研究 C：产品改进方案（引用研究 A + B）
   → AI 结合功能和痛点，给出针对性方案
```

**4. 团队协作研究**
```
团队成员 A：市场调研（研究 A）
   ↓
团队成员 B：竞品分析（研究 B，引用研究 A）
   ↓
团队成员 C：产品定位（研究 C，引用研究 A + B）
```

---

#### ❌ 不适合使用参考研究

**1. 无关联的新研究**
```
研究 A：新能源汽车市场趋势
研究 B：咖啡行业分析
   → 两者无关，不需要引用
```

**2. 研究时效性已过期**
```
研究 A：2023 年 AI 行业趋势
研究 B：2025 年 AI 行业趋势
   → 2023 年的数据已过时，引用意义不大
```

**3. 研究结论相互矛盾**
```
研究 A：认为市场会增长
研究 B：认为市场会萎缩
研究 C：综合分析（引用 A + B）
   → AI 可能会混淆，建议单独研究
```

---

### 数据模型

**UserChat**（研究会话）：
```typescript
{
  token: string,           // 研究唯一标识（用于引用）
  title: string,           // 研究标题
  kind: "study",           // 会话类型
  userId: number,          // 用户 ID
  analyst: Analyst,        // 关联的分析师
}
```

**Analyst**（分析师配置）：
```typescript
{
  studyLog: string,        // 研究日志（自动生成）
  topic: string,           // 研究主题
  kind: AnalystKind,       // 研究类型（testing/insights/creation/...）
}
```

**参考研究数据流**：
```
UserChat A (token: "abc123")
   ├─ Analyst
   │    └─ studyLog: "# 研究日志\n..."
   │
   └─ 研究完成

UserChat B (新研究)
   ├─ referenceTokens: ["abc123"]  // 引用研究 A
   │
   ├─ buildReferenceStudyContext()
   │    └─ 加载研究 A 的 studyLog
   │
   └─ AI 开始新研究（基于研究 A 的背景）
```

---

### 最佳实践

#### 1. 渐进式深入（推荐）

**场景**：产品创新研究

```
第 1 步：宏观市场研究
用户："研究 2025 年 AI 助手市场趋势"
   → 生成研究 A（市场规模、玩家、趋势）

第 2 步：竞品分析（引用研究 A）
用户："基于刚才的研究，深入分析 ChatGPT、Claude、Gemini 的差异化"
   [参考研究：研究 A]
   → AI 已知市场背景，直接进入竞品分析

第 3 步：产品定位（引用研究 A + B）
用户："基于市场趋势和竞品分析，给出我们产品的定位方案"
   [参考研究：研究 A, 研究 B]
   → AI 结合市场和竞品，给出定位方案
```

**优势**：
- 每次研究都站在之前的肩膀上
- 避免重复调研基础信息
- 研究深度逐步递增

---

#### 2. 多角度综合分析

**场景**：产品改进决策

```
研究 A：用户痛点研究
   → "用户抱怨功能 X 太复杂，成功率只有 40%"

研究 B：竞品功能研究
   → "竞品 Y 的同类功能成功率 85%，设计更简洁"

研究 C：产品改进方案（引用 A + B）
用户："基于用户痛点和竞品分析，给出功能 X 的改进方案"
   [参考研究：研究 A, 研究 B]
   → AI 结合痛点和竞品，给出具体改进建议
```

---

#### 3. 时间序列对比

**场景**：趋势追踪

```
研究 A：2024 Q4 消费趋势（2024 年 12 月）
   → "年轻人偏好健康食品，增长 25%"

研究 B：2025 Q1 消费趋势（2025 年 3 月，引用 A）
用户："研究 2025 Q1 消费趋势，对比 Q4 的变化"
   [参考研究：研究 A]
   → AI 自动对比：
      • Q4 → Q1 变化
      • 哪些趋势延续？哪些趋势逆转？
      • 背后原因是什么？
```

---

### 能力边界

#### ✅ 参考研究能做什么

1. **自动加载背景**：AI 自动理解之前的研究成果
2. **避免重复调研**：跳过已知信息，快速进入核心
3. **上下文连贯**：新研究是旧研究的自然延续
4. **多研究综合**：同时引用多个研究（最多 5 个）
5. **团队协作**：团队成员可以引用彼此的研究

#### ❌ 参考研究不能做什么

1. **跨用户引用**：只能引用自己的研究（隐私保护）
2. **自动更新**：引用的研究内容是静态的（不会实时更新）
3. **选择性引用**：无法只引用研究的某一部分（全部或不引用）
4. **研究合并**：无法将多个研究合并为一个新研究

---

## 功能 2：文件附件（File Attachments）

### 核心理念

文件附件让 AI 能够"看懂"你上传的图片和文档，并在研究中**自动提取和理解**这些资料的内容。

**类比**：
- **传统方式**：手动复制粘贴文档内容（受限于长度）
- **文件附件**：直接上传 PDF/图片，AI 自动提取全部内容

### 支持的文件类型

#### 1. 图片文件（最多 5 张）

**支持格式**：
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- SVG (.svg)

**处理流程**：
```
上传图片
   ↓
自动压缩优化（WebP 格式，800-4000px）
   ↓
转换为 Data URL
   ↓
Vision API 解析（Claude/GPT-4 Vision）
   ↓
AI 理解图片内容
```

**支持场景**：
- **截图**：网页、App 界面、数据图表
- **文档**：扫描件、手写笔记、PPT 截图
- **照片**：产品图、现场照片、原型设计
- **图表**：数据可视化、流程图、架构图

---

#### 2. 文档文件（最多 3 个）

**支持格式**：
- PDF (.pdf)
- 纯文本 (.txt)
- CSV (.csv)

**处理流程**：
```
上传文档
   ↓
文本提取（PDF → Text, 使用 Jina API）
   ↓
AI 压缩（GPT-5-mini，< 20K tokens）
   ↓
压缩文本存储（AttachmentFile.extra.compressedText）
   ↓
AI 理解文档内容
```

**支持场景**：
- **行业报告**：麦肯锡、艾瑞、Gartner 报告（PDF）
- **内部文档**：公司战略、产品 PRD、会议纪要
- **数据文件**：用户调研数据（CSV）
- **研究论文**：学术论文、白皮书

---

### 文件限制

```typescript
// src/lib/fileUploadLimits.ts
export const FILE_UPLOAD_LIMITS = {
  MAX_IMAGES: 5,                        // 最多 5 张图片
  MAX_DOCUMENTS: 3,                     // 最多 3 个文档
  MAX_SINGLE_FILE_SIZE: 3 * 1024 * 1024, // 单文件 3MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024,     // 总大小 50MB
} as const;
```

**检查逻辑**：
```typescript
// 检查文件上传限制
export function checkFileUploadLimits(
  existingFiles: FileUploadInfo[],
  newFile: FileUploadInfo,
): FileUploadCheckResult {
  // 1. 检查单文件大小
  if (newFile.size > FILE_UPLOAD_LIMITS.MAX_SINGLE_FILE_SIZE) {
    return {
      canUpload: false,
      reason: "max-single-file-size",
      message: "单个文件不能超过 3MB",
    };
  }

  // 2. 检查图片数量
  const images = existingFiles.filter(isImageFile);
  if (isImageFile(newFile.mimeType) && images.length >= FILE_UPLOAD_LIMITS.MAX_IMAGES) {
    return {
      canUpload: false,
      reason: "max-images",
      message: `最多上传 ${FILE_UPLOAD_LIMITS.MAX_IMAGES} 张图片`,
    };
  }

  // 3. 检查文档数量
  const documents = existingFiles.filter(isDocumentFile);
  if (isDocumentFile(newFile.mimeType) && documents.length >= FILE_UPLOAD_LIMITS.MAX_DOCUMENTS) {
    return {
      canUpload: false,
      reason: "max-documents",
      message: `最多上传 ${FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} 个文档`,
    };
  }

  // 4. 检查总大小
  const totalSize = existingFiles.reduce((acc, file) => acc + file.size, 0);
  if (totalSize + newFile.size > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
    return {
      canUpload: false,
      reason: "max-total-size",
      message: "总文件大小不能超过 50MB",
    };
  }

  return { canUpload: true };
}
```

---

### 文档处理流程

#### 阶段 1：文本提取

**PDF 提取**（使用 Jina API）：
```typescript
// src/ai/reader.ts
export async function parsePDFToText({ name, objectUrl, mimeType }) {
  const fileUrl = await s3SignedUrl(objectUrl);
  rootLogger.info({ msg: "Parsing file with Jina API", name });

  // 调用 Jina API
  const response = await proxiedFetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({ url: fileUrl }),
  });

  const extractedText = await response.text();
  return extractedText;
}
```

**纯文本/CSV 提取**：
```typescript
async function extractFullText(file: AttachmentFile): Promise<string> {
  const { mimeType, objectUrl } = file;

  if (mimeType === "application/pdf") {
    return await parsePDFToText({ name, objectUrl, mimeType });
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const fileUrl = await s3SignedUrl(objectUrl);
    const response = await proxiedFetch(fileUrl);
    return await response.text();
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}
```

---

#### 阶段 2：AI 压缩

**为什么需要压缩？**
- 原始文本可能有 50K-200K tokens（如 100 页 PDF）
- AI 上下文窗口有限（Claude: 200K tokens）
- 多个文件 + 对话历史会超出限制

**压缩目标**：
- 每个文档 < 20K tokens（约 60K 字符）
- 保留所有关键信息（数据、观点、结论）
- 删除冗余内容（重复表述、无意义连接词）

**压缩实现**：
```typescript
// src/lib/attachments/processing.ts
export async function compressText({
  fullText,
  logger,
  abortSignal,
}): Promise<string> {
  const locale = await detectInputLanguage({ text: fullText });

  const systemPrompt =
    locale === "zh-CN"
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

输出格式：直接输出压缩后的文本内容，不要任何解释，不要任何开场白或结束语。`
      : `...`;

  const messages = [
    { role: "user", content: "以下是需要压缩的文本原文：" },
    { role: "user", content: fullText },
    {
      role: "user",
      content: "直接输出所有压缩后的文本内容，不要任何解释、不要任何开场白或结束语。",
    },
  ];

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
    maxOutputTokens: 20000, // 限制输出长度
    maxRetries: 3,
    onFinish: () => {
      logger.info({
        msg: "compressText onFinish",
        compressedTextLength: compressedText.length,
      });
      resolve(compressedText);
    },
    abortSignal,
  });

  return compressedText;
}
```

**压缩示例**：

**原始文本**（100K tokens）：
```markdown
# 2025 年新能源汽车市场趋势报告

## 前言
本报告由麦肯锡咨询公司撰写，旨在深入分析 2025 年新能源汽车市场的发展趋势。报告基于对 500 家企业和 10,000 名消费者的调研，以及对全球市场的深度分析...

## 第一章：市场规模分析
根据我们的调研，2025 年全球新能源汽车市场规模预计将达到 800 万辆，相比 2024 年的 590 万辆，同比增长 35%。这一增长主要由以下几个因素驱动：
1. 政府政策支持持续加码...
2. 消费者环保意识提升...
3. 技术进步降低成本...
...（省略 95 页）
```

**压缩后文本**（18K tokens）：
```markdown
# 2025 新能源汽车市场趋势（麦肯锡）

基于 500 企业+10K 消费者调研，全球市场分析。

## 市场规模
2025 预计 800 万辆（vs 2024 590 万，+35%）。驱动因素：政策支持、环保意识、成本下降。

## 主要玩家
特斯拉 18%，比亚迪 22%，蔚来 8%；比亚迪增速最快（+45% YoY）。

## 用户痛点
1. 续航焦虑（63% 提及）：实际续航 vs 标称续航差距大（冬季 -30%）
2. 充电不便（51% 提及）：充电桩密度不足（1:8 车桩比 vs 理想 1:1）
3. 保值率低（48% 提及）：3 年保值率 45% vs 燃油车 65%

## 核心趋势
- 高端市场增长放缓（+12%），中低端爆发（+58%）
- 智能化成关键差异点：自动驾驶（L2+ 渗透率 68%）、车机系统（车机好评度与销量相关性 0.73）
- 政策延续至 2027：补贴、充电桩建设（目标 500 万个）

...（保留所有关键数据和观点，删除冗余表述）
```

**压缩效果**：
- **长度**：100K tokens → 18K tokens（压缩 82%）
- **信息保留**：所有关键数据、观点、趋势（100%）
- **可读性**：紧凑但完整，AI 可直接理解

---

#### 阶段 3：存储

**数据模型**：
```typescript
// prisma/schema.prisma
model AttachmentFile {
  id        Int    @id @default(autoincrement())
  userId    Int
  name      String @db.VarChar(255)        // 文件名
  mimeType  String @db.VarChar(255)        // MIME 类型
  size      Int                            // 文件大小（字节）
  objectUrl String @unique @db.VarChar(255) // S3 URL
  extra     Json   @default("{}")          // 扩展字段

  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
}
```

**extra 字段**（AttachmentFileExtra）：
```typescript
export type AttachmentFileExtra = {
  processing?: {
    startsAt: number;  // 处理开始时间
  } | false;
  compressedText?: string;  // 压缩后的文本
  error?: string;           // 错误信息
};
```

**存储示例**：
```json
{
  "id": 123,
  "userId": 456,
  "name": "麦肯锡_新能源汽车报告_2025.pdf",
  "mimeType": "application/pdf",
  "size": 2048000,
  "objectUrl": "s3://bucket/attachments/user-456/file-123.pdf",
  "extra": {
    "processing": false,
    "compressedText": "# 2025 新能源汽车市场趋势（麦肯锡）\n\n基于 500 企业+10K 消费者调研...",
    "error": null
  },
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### AI 如何使用附件

#### 1. 图片附件（Vision API）

**处理流程**：
```typescript
// src/app/(study)/agents/baseAgentRequest.ts
async function waitUntilAttachmentsProcessed({ analyst, locale, streamWriter, streamingMessage }) {
  const attachments = await prisma.chatMessageAttachment.findMany({
    where: {
      userChatId: analyst.userChatId,
      fileType: "image", // 图片附件
    },
    include: {
      attachmentFile: true,
    },
  });

  // 转换图片为 Data URL
  const imageParts = await Promise.all(
    attachments.map(async (attachment) => {
      const dataUrl = await fileUrlToDataUrl({
        objectUrl: attachment.attachmentFile.objectUrl,
        mimeType: attachment.attachmentFile.mimeType,
      });

      return {
        type: "image",
        image: dataUrl,
      } as ImagePart;
    })
  );

  // 插入到消息中
  return imageParts;
}
```

**注入到对话**：
```typescript
const messages = [
  // 第 1 条消息：用户输入 + 图片附件
  {
    role: "user",
    content: [
      { type: "text", text: "帮我分析这份产品截图，找出设计问题" },
      { type: "image", image: "data:image/png;base64,iVBOR..." }, // 图片 1
      { type: "image", image: "data:image/png;base64,iVBOR..." }, // 图片 2
    ],
  },

  // AI 分析图片内容...
];
```

---

#### 2. 文档附件（压缩文本）

**处理流程**：
```typescript
async function waitUntilAttachmentsProcessed({ analyst, locale, streamWriter, streamingMessage }) {
  const attachments = await prisma.chatMessageAttachment.findMany({
    where: {
      userChatId: analyst.userChatId,
      fileType: "document", // 文档附件
    },
    include: {
      attachmentFile: true,
    },
  });

  // 等待文档处理完成
  const processedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const file = await parseAttachmentText(attachment.attachmentFile.id);
      return file;
    })
  );

  // 构建文档内容文本
  const documentContents = processedAttachments
    .filter((file) => file.extra.compressedText)
    .map((file) => {
      return `<文档_${file.name}>
${file.extra.compressedText}
</文档_${file.name}>`;
    })
    .join("\n\n");

  return documentContents;
}
```

**注入到对话**：
```typescript
const messages = [
  // 第 1 条消息：系统注入的文档内容
  {
    role: "user",
    content: `以下是用户上传的参考文档，请仔细阅读：

<文档_麦肯锡_新能源汽车报告_2025.pdf>
# 2025 新能源汽车市场趋势（麦肯锡）

基于 500 企业+10K 消费者调研，全球市场分析。

## 市场规模
2025 预计 800 万辆（vs 2024 590 万，+35%）...
</文档_麦肯锡_新能源汽车报告_2025.pdf>

<文档_艾瑞_消费者调研报告_2024.pdf>
# 2024 新能源汽车消费者调研（艾瑞咨询）

调研样本：10K 消费者，覆盖 50 城市。

## 核心痛点
1. 续航焦虑（63% 提及）...
2. 充电不便（51% 提及）...
</文档_艾瑞_消费者调研报告_2024.pdf>

现在，基于这些文档内容，开始你的研究。`,
  },

  // 第 2 条消息：用户的研究问题
  {
    role: "user",
    content: "基于这两份报告，深入分析续航焦虑的真实原因",
  },

  // AI 开始研究（已理解文档内容）...
];
```

---

### 真实案例演示

#### 案例 1：产品设计分析 + 截图

**用户请求**：
```
"帮我分析这个 App 的首页设计，找出可以改进的地方"

[附件 1：App 首页截图.png]
[附件 2：竞品首页截图.png]
[附件 3：用户反馈截图.png]
```

**AI 处理流程**：

**阶段 1：图片解析**
```
Vision API 解析 3 张图片：

图片 1：App 首页截图
• 顶部：搜索框（占比 15%）
• 中部：轮播图（占比 30%）
• 底部：功能入口（8 个图标，排列紧密）
• 整体：信息密度高，视觉拥挤

图片 2：竞品首页截图
• 顶部：简洁导航
• 中部：大图 + 标题（占比 50%）
• 底部：2-3 个核心功能入口
• 整体：留白充足，视觉清爽

图片 3：用户反馈截图
• 评论 1："首页太乱了，不知道从哪开始"
• 评论 2："功能太多，找不到想要的"
• 评论 3："希望简化一下"
```

**阶段 2：对比分析**
```
AI 分析：

设计问题：
1. 信息密度过高（首页 vs 竞品：8 个入口 vs 2-3 个）
2. 视觉层级不清晰（轮播图 + 功能入口同等权重）
3. 用户抱怨"太乱"（对应问题 1 和 2）

改进建议：
1. 精简功能入口：8 个 → 3-4 个核心功能
2. 强化视觉层级：加大核心功能区占比（30% → 50%）
3. 增加留白：减少元素密度，提升呼吸感
4. 优化轮播图：减少至 1-2 张，突出核心价值

参考竞品设计：
• 竞品 A：大图 + 2 个核心入口（简洁有力）
• 竞品 B：标题 + 3 个功能卡片（清晰直观）
```

**用户体验**：
- **无需描述图片**：直接上传，AI 自动理解
- **多图对比**：同时分析自家 + 竞品 + 用户反馈
- **结构化输出**：问题 + 建议 + 参考案例

---

#### 案例 2：行业研究 + PDF 报告

**用户请求**：
```
"基于这两份报告，分析 2025 年新能源汽车市场的核心机会"

[附件 1：麦肯锡_新能源汽车报告_2025.pdf（50 页，2.5MB）]
[附件 2：艾瑞_消费者调研报告_2024.pdf（80 页，2.8MB）]
```

**AI 处理流程**：

**阶段 1：文档处理**（5 分钟）
```
文档 1：麦肯锡_新能源汽车报告_2025.pdf
• 提取文本：50 页 → 100K tokens
• AI 压缩：100K tokens → 18K tokens
• 存储：AttachmentFile.extra.compressedText

文档 2：艾瑞_消费者调研报告_2024.pdf
• 提取文本：80 页 → 150K tokens
• AI 压缩：150K tokens → 19K tokens
• 存储：AttachmentFile.extra.compressedText
```

**阶段 2：AI 研究**（5 分钟）
```
加载文档内容 → 分析核心机会

从麦肯锡报告提取：
• 市场规模：2025 年 800 万辆（+35%）
• 增速最快：中低端市场（+58%）
• 关键趋势：智能化（L2+ 渗透率 68%）

从艾瑞报告提取：
• 核心痛点：续航焦虑（63%）、充电不便（51%）
• 付费意愿：愿为智能化多付 10-20%（72% 用户）
• 决策因素：智能化 > 续航 > 价格（排序变化）

综合分析 → 核心机会：
1. 中低端市场（+58% 增速）
   • 机会：性价比车型 + 基础智能化
   • 目标客户：首次购车、预算 15-25 万

2. 智能化升级（72% 愿付费）
   • 机会：L2+ 自动驾驶 + 智能车机
   • 差异化：软件体验 > 硬件参数

3. 充电体验优化（51% 痛点）
   • 机会：快充网络 + 充电便利服务
   • 合作：与充电桩运营商合作

数据支撑：
• 麦肯锡：中低端增速 +58%
• 艾瑞：72% 愿为智能化付费
• 艾瑞：51% 抱怨充电不便
```

**用户体验**：
- **无需手动摘录**：130 页 PDF 自动提取和压缩
- **跨文档分析**：综合两份报告的数据和观点
- **数据支撑**：所有结论都有明确来源

---

### 能力边界

#### ✅ 文件附件能做什么

**图片附件**：
1. **截图分析**：App 界面、网页设计、数据图表
2. **文档扫描**：手写笔记、PPT 截图、会议白板
3. **照片识别**：产品图、现场照片、原型设计
4. **图表解读**：柱状图、折线图、饼图、流程图

**文档附件**：
1. **PDF 解析**：行业报告（麦肯锡、艾瑞、Gartner）
2. **文本提取**：公司战略、产品 PRD、会议纪要
3. **数据导入**：CSV 用户调研数据
4. **论文理解**：学术论文、白皮书

**处理能力**：
1. **自动提取**：无需手动复制粘贴
2. **智能压缩**：保留关键信息，删除冗余（< 20K tokens）
3. **跨文件分析**：同时理解多个文件（最多 5 图 + 3 文档）
4. **结构化输出**：AI 自动整理和分析文件内容

---

#### ❌ 文件附件不能做什么

**图片限制**：
1. **低质量图片**：模糊、扭曲、过暗的图片识别率低
2. **复杂图表**：过于复杂的图表（如 50+ 指标的表格）可能解析不完整
3. **视频文件**：不支持视频（仅支持静态图片）

**文档限制**：
1. **Word/Excel/PPT**：暂不支持（仅支持 PDF/TXT/CSV）
2. **加密 PDF**：无法解析加密或密码保护的 PDF
3. **图片型 PDF**：扫描版 PDF（纯图片）识别率低（需 OCR）
4. **超大文档**：> 200 页的 PDF 压缩后可能丢失部分信息

**处理限制**：
1. **实时处理**：文档处理需要 2-5 分钟（取决于文件大小）
2. **格式保留**：压缩后会丢失格式（如表格边框、颜色）
3. **图片内容**：PDF 中的图片不会被提取（仅提取文字）

---

## 组合使用：参考研究 + 文件附件

### 场景 1：基于报告的渐进式研究

```
第 1 步：上传行业报告（文件附件）
用户："基于这份麦肯锡报告，分析 2025 年新能源汽车市场"
   [附件：麦肯锡_新能源汽车报告_2025.pdf]
   → AI 提取报告内容，生成研究 A

第 2 步：深入分析（参考研究 + 新上传）
用户："基于刚才的研究，深入分析用户痛点。我又找到了艾瑞的调研报告。"
   [参考研究：研究 A]
   [附件：艾瑞_消费者调研报告_2024.pdf]
   → AI 已知麦肯锡报告内容（从研究 A）
   → 新提取艾瑞报告内容
   → 综合两份报告，深入分析痛点

第 3 步：产品方案设计（参考研究 + 新截图）
用户："基于市场分析和用户痛点，设计产品方案。这是我们的竞品截图。"
   [参考研究：研究 A, 研究 B]
   [附件：竞品A截图.png, 竞品B截图.png]
   → AI 已知市场背景（研究 A）和用户痛点（研究 B）
   → 新分析竞品截图
   → 综合设计产品方案
```

---

### 场景 2：团队协作研究

```
团队成员 A：市场调研
   [附件：行业报告 1.pdf, 行业报告 2.pdf]
   → 生成研究 A（市场规模、趋势、玩家）

团队成员 B：竞品分析（基于 A 的市场调研）
   [参考研究：研究 A]
   [附件：竞品截图 1.png, 竞品截图 2.png]
   → 生成研究 B（竞品功能、设计、定位）

团队成员 C：产品定位（基于 A + B）
   [参考研究：研究 A, 研究 B]
   [附件：用户调研数据.csv]
   → 生成研究 C（产品定位、差异化、价格策略）
```

---

## 最佳实践

### 1. 文件命名规范

**推荐命名方式**：
```
✅ 好的命名：
• 麦肯锡_新能源汽车报告_2025.pdf
• 艾瑞_消费者调研_2024Q4.pdf
• 竞品A_首页截图_20250115.png
• 用户反馈_Bug列表_v2.csv

❌ 不好的命名：
• 报告.pdf（无法区分）
• 截图1.png（无法识别内容）
• 新建文本文档.txt（无意义）
• download (1).pdf（机器命名）
```

**命名规则**：
- 包含来源（如"麦肯锡"、"艾瑞"）
- 包含内容（如"市场报告"、"用户调研"）
- 包含时间（如"2025"、"2024Q4"）
- 使用下划线分隔（便于识别）

---

### 2. 文件选择策略

**图片选择**：
```
✅ 高质量图片：
• 清晰的截图（分辨率 1920x1080+）
• 完整的界面（无裁剪）
• 明亮的照片（无过暗或过曝）
• 结构化的图表（有标题、图例）

❌ 低质量图片：
• 模糊的照片
• 部分裁剪的截图
• 过暗或过曝的照片
• 手机拍摄的屏幕（有摩尔纹）
```

**文档选择**：
```
✅ 适合上传的文档：
• 正式行业报告（麦肯锡、艾瑞、Gartner）
• 结构化文档（有章节、标题、数据）
• 纯文字 PDF（可复制文字）
• 数据表格（CSV 格式）

❌ 不适合上传的文档：
• 扫描版 PDF（纯图片，需 OCR）
• 加密 PDF（无法解析）
• Word/PPT 文档（暂不支持）
• 超大文档（> 200 页）
```

---

### 3. 上传时机

**最佳时机**：
```
✅ 研究开始时上传：
   "基于这份报告，分析市场趋势"
   [附件：行业报告.pdf]
   → AI 从一开始就理解文档内容

❌ 研究中途上传：
   "分析市场趋势"（AI 开始研究）
   → 10 分钟后
   "哦对了，我有份报告，再上传一下"
   → AI 已经完成研究，需要重新开始
```

---

### 4. 多文件组织

**推荐方式**：
```
✅ 分类上传：
• 第 1 组：市场报告（2-3 个 PDF）
   "基于这些报告，分析市场"
   [麦肯锡报告.pdf, 艾瑞报告.pdf, Gartner报告.pdf]

• 第 2 组：竞品截图（3-5 张图片）
   "分析竞品设计"
   [竞品A首页.png, 竞品B功能.png, 竞品C定价.png]

❌ 混乱上传：
   "分析这些资料"
   [报告1.pdf, 截图1.png, 报告2.pdf, 截图2.png, ...]
   → AI 难以理解文件之间的关系
```

---

## 技术细节

### 数据模型

**AttachmentFile**（文件存储）：
```typescript
{
  id: number,
  userId: number,
  name: string,                // 文件名
  mimeType: string,            // MIME 类型
  size: number,                // 文件大小（字节）
  objectUrl: string,           // S3 URL
  extra: {
    processing?: { startsAt: number } | false,
    compressedText?: string,   // 压缩后的文本（文档）
    error?: string,             // 错误信息
  },
  createdAt: DateTime,
}
```

**ChatMessageAttachment**（附件关联）：
```typescript
{
  chatMessageId: number,       // 关联的消息 ID
  attachmentFileId: number,    // 关联的文件 ID
  fileType: "image" | "document",
}
```

---

### 处理流程

**完整流程图**：
```
用户上传文件
   ↓
前端验证（文件类型、大小、数量）
   ↓
上传到 S3（生成 objectUrl）
   ↓
创建 AttachmentFile 记录
   ↓
关联到 ChatMessage（ChatMessageAttachment）
   ↓
文档处理（后台异步）
   ├─ 提取文本（Jina API for PDF）
   ├─ AI 压缩（GPT-5-mini, < 20K tokens）
   └─ 存储到 AttachmentFile.extra.compressedText
   ↓
AI 执行时加载附件
   ├─ 图片：转换为 Data URL → Vision API
   └─ 文档：加载 compressedText → 注入消息
   ↓
AI 理解附件内容 → 开始研究
```

---

### 关键文件

**文件上传**：
- `src/lib/fileUploadLimits.ts` - 文件上传限制
- `src/hooks/use-file-upload-manager.ts` - 文件上传管理 Hook
- `src/lib/attachments/actions.ts` - 文件上传 Server Action

**文件处理**：
- `src/lib/attachments/processing.ts` - 文档文本提取和压缩
- `src/ai/reader.ts` - PDF 解析（Jina API）
- `src/lib/attachments/lib.ts` - 图片转 Data URL

**AI 集成**：
- `src/app/(study)/agents/baseAgentRequest.ts` - 通用附件处理
- `src/app/(study)/agents/utils.ts` - `waitUntilAttachmentsProcessed()`
- `src/app/(study)/agents/referenceContext.ts` - 参考研究构建

---

## FAQ

### 1. 参考研究和文件附件有什么区别？

**参考研究**：
- **来源**：之前完成的研究（atypica.AI 内部）
- **内容**：研究日志（studyLog）
- **目的**：延续上下文，避免重复调研

**文件附件**：
- **来源**：用户上传的文件（外部资料）
- **内容**：图片、PDF、TXT、CSV
- **目的**：理解外部资料，结合研究

**类比**：
- **参考研究** = 你之前写的论文草稿
- **文件附件** = 你收集的参考资料

---

### 2. 可以同时使用参考研究和文件附件吗？

**可以！** 这是最强大的组合使用方式。

**示例**：
```
研究 A：市场调研（2024 年 12 月完成）
   [附件：行业报告 1.pdf, 行业报告 2.pdf]
   → 市场规模、趋势、玩家

研究 B：竞品分析（2025 年 1 月，引用研究 A）
   [参考研究：研究 A]
   [附件：竞品截图 1.png, 竞品截图 2.png, 竞品报告.pdf]
   → AI 已知市场背景（研究 A）
   → 新分析竞品截图和报告
   → 生成竞品对比分析
```

---

### 3. 文档处理需要多长时间？

**处理时间**（取决于文件大小）：
- **小文档**（< 20 页）：1-2 分钟
- **中等文档**（20-50 页）：2-3 分钟
- **大文档**（50-100 页）：3-5 分钟
- **超大文档**（100-200 页）：5-10 分钟

**处理步骤**：
1. 文本提取（Jina API）：30-60 秒
2. AI 压缩（GPT-5-mini）：1-4 分钟（取决于文档长度）
3. 存储（数据库）：< 1 秒

**用户体验**：
- 处理过程在后台异步进行
- 用户可以继续操作（如输入研究问题）
- AI 会等待文档处理完成后再开始研究

---

### 4. 为什么文档要压缩？

**原因**：
1. **上下文限制**：AI 上下文窗口有限（Claude: 200K tokens）
2. **效率优化**：压缩后的文档更紧凑，AI 理解更快
3. **成本降低**：减少 token 消耗，降低 API 成本

**压缩效果**：
- **原始文档**：100 页 PDF = 100K tokens
- **压缩后**：18K tokens（压缩 82%）
- **信息保留**：100%（所有关键数据、观点、结论）

**压缩原则**：
- 保留所有关键信息（数据、观点、结论）
- 删除冗余内容（重复表述、无意义连接词）
- 使用紧凑格式（分号连接、缩写）

---

### 5. 可以上传 Word/Excel/PPT 吗？

**目前不支持**，仅支持：
- **图片**：JPEG, PNG, GIF, WebP, BMP, SVG
- **文档**：PDF, TXT, CSV

**替代方案**：
1. **Word → PDF**：导出为 PDF 后上传
2. **Excel → CSV**：导出为 CSV 后上传
3. **PPT → PDF**：导出为 PDF 后上传

**未来计划**：
- 支持 Word (.docx)
- 支持 Excel (.xlsx)
- 支持 PowerPoint (.pptx)

---

### 6. 图片和文档的处理有什么不同？

**图片处理**：
- **提取方式**：Vision API（Claude/GPT-4 Vision）
- **处理时间**：实时（< 1 秒）
- **内容理解**：AI 直接"看懂"图片内容
- **适用场景**：截图、照片、图表、设计稿

**文档处理**：
- **提取方式**：文本提取（Jina API） + AI 压缩
- **处理时间**：2-5 分钟（后台异步）
- **内容理解**：AI 理解压缩后的文本
- **适用场景**：报告、论文、PRD、会议纪要

---

### 7. 参考研究的数量有限制吗？

**有限制**：最多引用 **5 个**研究

**原因**：
- **上下文限制**：每个研究的 studyLog 约 10-20K tokens
- **可理解性**：引用太多研究，AI 可能混淆

**最佳实践**：
- 引用 1-2 个相关研究（最常见）
- 引用 3-4 个研究（适合多维度分析）
- 避免引用 5 个以上（上下文过载）

---

### 8. 文件附件会消耗多少 tokens？

**图片**：
- **单张图片**：约 1K-2K tokens（取决于复杂度）
- **5 张图片**：约 5K-10K tokens

**文档**：
- **单个文档**：< 20K tokens（压缩后）
- **3 个文档**：< 60K tokens

**总计**（最大配置）：
- 5 张图片 + 3 个文档 = 约 70K tokens
- 对话历史 + 附件 = 约 100K tokens（在 Claude 200K 限制内）

---

## 总结

**参考研究 + 文件附件**是 atypica.AI 的核心能力，让 AI 真正"站在你的肩膀上"：

### 核心价值

**1. 持续积累**
- 每次研究都有 `studyLog`，可被后续研究引用
- 知识不孤立，形成可复用的研究资产

**2. 深度整合**
- 自动提取文档内容（PDF/图片）
- 智能压缩（< 20K tokens），保留所有关键信息
- 跨文件分析（同时理解多个资料）

**3. 效率提升**
- 避免重复调研（引用之前的研究）
- 无需手动摘录（自动提取和压缩）
- 快速进入核心（基于已有背景）

---

### 适用场景

**参考研究**：
- ✅ 渐进式深入研究（宏观 → 微观）
- ✅ 跨时间对比研究（Q4 vs Q1）
- ✅ 多维度综合分析（市场 + 竞品 + 用户）
- ✅ 团队协作研究（成员 A → 成员 B → 成员 C）

**文件附件**：
- ✅ 行业报告分析（麦肯锡、艾瑞、Gartner）
- ✅ 产品设计分析（App 截图、竞品截图）
- ✅ 用户调研数据（CSV 数据表格）
- ✅ 内部文档整合（PRD、战略、会议纪要）

---

### 与其他功能的关系

```
Plan Mode（意图澄清层）
    ↓
参考研究 + 文件附件（背景加载）
    ↓
Study Agent / Fast Insight Agent（执行层）
    ↓
Memory System（持久化记忆）
```

**功能协同**：
- **Plan Mode**：判断是否需要引用研究或上传文件
- **参考研究**：加载之前的研究日志
- **文件附件**：提取和压缩用户上传的资料
- **Memory System**：持久化用户偏好和研究习惯

---

**相关文档**：
- [Plan Mode 价值说明](./plan-mode.md) - 了解研究意图澄清
- [Fast Insight Agent](./fast-insight-agent.md) - 了解播客驱动研究
- [Memory System 机制](./memory-system.md) - 了解持久化记忆
- [Scout Agent 深度解析](./scout-agent.md) - 了解社交媒体观察
