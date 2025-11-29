# Sage 记忆更新策略改进方案

## 当前问题分析

### 1. 初始构建 (buildMemoryDocument)

**当前做法**:
- Step 1: 用 Gemini 清洗内容（去除噪音）
- Step 2: 用 Claude 构建结构化文档
- 直接将所有原始内容拼接后一次性处理

**存在的问题**:
- ❌ **丢失细节**: 一次性处理可能导致信息压缩过度
- ❌ **缺乏溯源**: 无法追踪某个知识点来自哪个具体 source
- ❌ **无法更新单个部分**: 必须重新生成整个文档
- ❌ **Context 限制**: 大量内容可能超出 context window

### 2. 从访谈更新 (updateMemoryDocumentFromInterview)

**当前做法** (memory.ts:414-420):
```typescript
const updatedMemoryDocument = await buildMemoryDocument({
  sage,
  rawContent: `${memoryDocument?.content}\n\n# New Knowledge from Interview\n\n${interviewTranscript}`,
  locale,
  statReport,
  logger,
});
```

**存在的问题**:
- ❌ **简单拼接**: 直接把旧文档和新访谈拼在一起，让 AI 重新生成
- ❌ **低效**: 每次都重新生成整个文档，成本高
- ❌ **质量不稳定**: AI 可能改写原有内容，而不是精准更新
- ❌ **缺乏增量控制**: 无法控制哪些部分应该更新，哪些应该保留

### 3. Gap 解决判断过于简单

**当前做法** (memory.ts:439-451):
```typescript
// 简单的字符串匹配
for (const gap of pendingGaps) {
  const transcriptLower = interviewTranscript.toLowerCase();
  const gapAreaLower = gap.area.toLowerCase();

  if (transcriptLower.includes(gapAreaLower) ||
      transcriptLower.includes(gap.description.toLowerCase())) {
    resolvedGapIds.push(gap.id);
  }
}
```

**存在的问题**:
- ❌ 简单的字符串匹配，误判率高
- ❌ 无法判断知识是否真正被充分补充
- ❌ 没有评估新知识的质量

---

## 改进策略

## 策略 1: 分层记忆架构 (⭐⭐⭐⭐⭐)

参考人脑的记忆系统，采用多层架构：

```
记忆层级:
┌─────────────────────────────────────────┐
│ Layer 1: Core Memory (核心记忆)         │
│ - 稳定的、经过验证的核心知识            │
│ - 很少更新，除非发现重大错误             │
│ - 来源: 初始知识源                       │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Layer 2: Working Memory (工作记忆)      │
│ - 最近学习的知识                         │
│ - 通过访谈、对话补充的内容               │
│ - 定期整合到核心记忆                     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Layer 3: Episodic Memory (情景记忆)     │
│ - 具体的对话记录、案例                   │
│ - 用于回溯和验证                         │
│ - 不直接用于对话，但可引用               │
└─────────────────────────────────────────┘
```

### 数据结构设计

```typescript
interface LayeredMemoryDocument {
  version: number;
  layers: {
    core: {
      // 核心知识，结构化 Markdown
      content: string;
      lastUpdated: Date;
      confidence: number; // 0-1，知识可信度
    };
    working: {
      // 工作记忆，最近补充的知识
      items: Array<{
        id: string;
        content: string;
        source: "interview" | "conversation";
        sourceId: string;
        addedAt: Date;
        confidence: number;
        relatedTopics: string[]; // 关联的核心主题
      }>;
    };
    episodic: {
      // 情景记忆，对话记录索引
      references: Array<{
        chatId: string;
        timestamp: Date;
        topic: string;
        keyInsights: string[];
      }>;
    };
  };
}
```

### 更新策略

1. **新知识先进入 Working Memory**
   - 访谈或对话中获得的知识作为独立 item
   - 标注来源、时间、置信度
   - 关联到核心主题

2. **定期（或手动触发）整合到 Core Memory**
   - 当 Working Memory 积累到一定数量（如 5-10 items）
   - 或用户手动触发"整合知识"
   - AI 分析 working items，更新核心文档相关部分

3. **Episodic Memory 用于验证和追溯**
   - 记录对话的元信息和关键洞察
   - 不直接用于对话生成
   - 用于验证知识、提供案例引用

### 对话时的记忆使用

```typescript
// 生成对话时的系统提示词
const memoryContext = `
<Core Knowledge>
${memory.layers.core.content}
</Core Knowledge>

<Recent Learning (Working Memory)>
${memory.layers.working.items.map(item => `
- Topic: ${item.relatedTopics.join(", ")}
- Source: ${item.source} (${item.sourceId})
- Content: ${item.content}
- Confidence: ${item.confidence}
`).join('\n')}
</Recent Learning>

<Relevant Past Conversations>
${getRelevantEpisodes(userQuestion, memory.layers.episodic.references)}
</Relevant Past Conversations>
`;
```

### 实现优先级

**Phase 1 (立即实施)**:
- 在现有 Memory Document 基础上，添加 Working Memory 字段
- 新知识（访谈/对话）不再重新生成整个文档，而是添加到 Working Memory
- 对话时同时使用 Core + Working Memory

**Phase 2 (1-2周后)**:
- 实现"整合到核心记忆"功能
- 提供 UI 查看和管理 Working Memory items
- 支持手动/自动整合策略

**Phase 3 (1个月后)**:
- 引入 Episodic Memory
- 优化记忆检索策略
- 添加记忆可视化界面

---

## 策略 2: Diff-based 增量更新 (⭐⭐⭐⭐)

借鉴代码版本控制的思想，采用 diff 更新。

### 核心思路

1. **解析记忆文档结构** - 将 Markdown 文档解析为 sections
2. **生成更新计划** - AI 分析哪些 sections 需要更新
3. **精准更新** - 只更新必要的 sections
4. **记录变更** - 详细的 diff 记录

### 实现方案

```typescript
interface MemorySection {
  id: string;
  level: number; // heading level (1-6)
  title: string;
  content: string;
  subsections: MemorySection[];
}

// 解析 Markdown 文档为树状结构
function parseMemoryDocument(markdown: string): MemorySection[] {
  // 使用 markdown parser 解析
  // 返回树状结构的 sections
}

// 生成更新计划
async function generateUpdatePlan({
  sections: MemorySection[],
  newKnowledge: string,
  focusAreas: string[],
  locale: Locale,
}): Promise<{
  sectionsToUpdate: Array<{
    sectionId: string;
    updateType: "append" | "modify" | "replace";
    instruction: string;
  }>;
  newSections: Array<{
    title: string;
    parentId?: string;
    content: string;
  }>;
  reasoning: string;
}> {
  const result = await generateObject({
    model: llm("gpt-4o"),
    schema: updatePlanSchema,
    system: updatePlannerSystem({ locale }),
    prompt: `
<Current Memory Structure>
${formatSectionsForAI(sections)}
</Current Memory Structure>

<New Knowledge>
${newKnowledge}
</New Knowledge>

<Focus Areas>
${focusAreas.join(", ")}
</Focus Areas>

Generate an update plan:
1. Which sections need to be updated?
2. Should we append, modify, or replace content?
3. Do we need to create new sections?
    `,
  });

  return result.object;
}

// 更新单个 section
async function updateSection({
  original: MemorySection,
  newKnowledge: string,
  updateInstruction: string,
  updateType: "append" | "modify" | "replace",
  locale: Locale,
}): Promise<{
  updatedContent: string;
  changes: string; // 变更说明
}> {
  const prompt =
    updateType === "append"
      ? `Add the following new knowledge to the existing content:\n\n${original.content}\n\n---\n\nNew: ${newKnowledge}`
      : updateType === "modify"
      ? `Integrate the new knowledge into existing content:\n\nOriginal:\n${original.content}\n\nNew knowledge:\n${newKnowledge}\n\nInstruction: ${updateInstruction}`
      : `Replace the section with new content based on:\n${newKnowledge}`;

  const result = await streamText({
    model: llm("claude-sonnet-4-5"),
    system: sectionUpdaterSystem({ sectionTitle: original.title, locale }),
    prompt,
  });

  // ... consume stream and return updated content
}

// 主更新函数
async function updateMemoryWithDiff({
  currentMemory: string,
  newKnowledge: string,
  focusAreas: string[],
  locale: Locale,
  statReport: StatReporter,
  logger: Logger,
}): Promise<{
  updatedMemory: string;
  changes: Array<{
    section: string;
    type: "added" | "modified" | "unchanged";
    before?: string;
    after: string;
    reasoning: string;
  }>;
}> {
  // 1. 解析当前记忆文档的结构
  const sections = parseMemoryDocument(currentMemory);

  // 2. 生成更新计划
  const updatePlan = await generateUpdatePlan({
    sections,
    newKnowledge,
    focusAreas,
    locale,
  });

  // 3. 执行更新
  const updatedSections = new Map<string, string>();
  const changes: Array<any> = [];

  for (const sectionUpdate of updatePlan.sectionsToUpdate) {
    const original = findSection(sections, sectionUpdate.sectionId);
    const { updatedContent, changes: sectionChanges } = await updateSection({
      original,
      newKnowledge,
      updateInstruction: sectionUpdate.instruction,
      updateType: sectionUpdate.updateType,
      locale,
    });

    updatedSections.set(sectionUpdate.sectionId, updatedContent);
    changes.push({
      section: original.title,
      type: "modified",
      before: original.content,
      after: updatedContent,
      reasoning: sectionUpdate.instruction,
    });
  }

  // 4. 合并成新文档
  const updatedMemory = reconstructDocument(sections, updatedSections, updatePlan.newSections);

  return { updatedMemory, changes };
}
```

### 优点

- ✅ **精准更新**: 只修改需要更新的部分，保持其他内容不变
- ✅ **成本优化**: 不需要每次重新生成整个文档
- ✅ **质量保证**: AI 专注于局部更新，减少误改
- ✅ **可追溯**: 详细的变更记录，便于审查和回滚
- ✅ **灵活性**: 支持追加、修改、替换多种更新方式

### 实现优先级

**Phase 1 (立即实施)**:
- 实现 Markdown 解析器（parseMemoryDocument）
- 实现更新计划生成（generateUpdatePlan）
- 替换访谈更新逻辑

**Phase 2 (1周后)**:
- 优化 section 更新策略
- 添加变更预览 UI
- 支持用户确认/修改更新计划

**Phase 3 (2周后)**:
- 实现部分回滚功能
- 可视化 diff 展示
- 自动检测冲突和重复内容

---

## 策略 3: 智能 Gap 解决判断 (⭐⭐⭐⭐)

替换当前的字符串匹配，使用 AI 深度分析。

### 实现方案

```typescript
const gapResolutionSchema = z.object({
  resolved: z.array(z.object({
    gapId: z.number(),
    confidence: z.number().min(0).max(1).describe("0-1, how well the gap was resolved"),
    reasoning: z.string().describe("Why this gap is considered resolved"),
    evidenceQuotes: z.array(z.string()).describe("Quotes from interview that support resolution"),
  })),
  partiallyResolved: z.array(z.object({
    gapId: z.number(),
    confidence: z.number().min(0).max(1).describe("Partial resolution confidence"),
    reasoning: z.string().describe("What was partially addressed"),
    missingAspects: z.array(z.string()).describe("What aspects are still missing"),
  })),
  unresolved: z.array(z.number()).describe("Gap IDs that were not addressed at all"),
  newGapsDiscovered: z.array(z.object({
    area: z.string(),
    description: z.string(),
    severity: z.enum(["critical", "important", "nice-to-have"]),
    reasoning: z.string(),
  })).describe("New knowledge gaps discovered during analysis"),
});

async function analyzeGapResolution({
  gaps: KnowledgeGap[],
  interviewTranscript: string,
  originalMemory: string,
  updatedMemory: string,
  locale: Locale,
  statReport: StatReporter,
}): Promise<{
  resolved: Array<{ gapId: number; confidence: number; reasoning: string; evidenceQuotes: string[] }>;
  partiallyResolved: Array<{ gapId: number; confidence: number; reasoning: string; missingAspects: string[] }>;
  unresolved: number[];
  newGapsDiscovered: Array<{
    area: string;
    description: string;
    severity: "critical" | "important" | "nice-to-have";
    reasoning: string;
  }>;
}> {
  const result = await generateObject({
    model: llm("gpt-4o"),
    schema: gapResolutionSchema,
    system: gapResolutionAnalysisSystem({ locale }),
    prompt: `
<Knowledge Gaps to Analyze>
${gaps.map(g => `
Gap ID: ${g.id}
Area: ${g.area}
Description: ${g.description}
Severity: ${g.severity}
Impact: ${g.impact}
`).join('\n---\n')}
</Knowledge Gaps to Analyze>

<Interview Transcript>
${interviewTranscript}
</Interview Transcript>

<Memory Changes>
=== Before Interview ===
${originalMemory}

=== After Interview ===
${updatedMemory}
</Memory Changes>

Analyze:
1. Which gaps were fully resolved? (confidence >= 0.8)
2. Which gaps were partially resolved? (0.3 <= confidence < 0.8)
3. Which gaps remain unresolved? (confidence < 0.3)
4. Were any NEW gaps discovered during the interview?

For each resolved/partially resolved gap:
- Provide evidence from the interview
- Explain what knowledge was added
- Rate your confidence in the resolution
    `,
    maxRetries: 3,
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "gap resolution analysis",
    });
  }

  return result.object;
}
```

### System Prompt

```typescript
export const gapResolutionAnalysisSystem = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `你是知识空白分析专家，负责评估访谈是否成功填补了专家的知识空白。

<分析标准>
1. **完全解决** (confidence >= 0.8)
   - 访谈中提供了该领域的详细知识
   - 包含具体案例、经验或深度见解
   - 能够回答该领域的常见问题
   - 记忆文档中已经整合了相关内容

2. **部分解决** (0.3 <= confidence < 0.8)
   - 访谈涉及了该领域，但深度不够
   - 缺少具体案例或实践经验
   - 只覆盖了部分方面
   - 需要进一步补充

3. **未解决** (confidence < 0.3)
   - 访谈完全没有涉及该领域
   - 只是简单提及，没有实质内容
   - 提供的信息与 gap 不相关
</分析标准>

<输出要求>
- 对每个 gap 给出明确的判断
- 提供具体的证据（引用访谈内容）
- 解释你的推理过程
- 如果发现新的知识空白，也要指出
</输出要求>`
    : `You are a knowledge gap analysis expert, responsible for evaluating whether interviews successfully filled the expert's knowledge gaps.

<Analysis Criteria>
1. **Fully Resolved** (confidence >= 0.8)
   - Interview provided detailed knowledge in the area
   - Includes specific cases, experiences, or deep insights
   - Can answer common questions in the field
   - Related content has been integrated into memory document

2. **Partially Resolved** (0.3 <= confidence < 0.8)
   - Interview touched on the area but lacks depth
   - Missing specific examples or practical experience
   - Only covers some aspects
   - Needs further supplementation

3. **Unresolved** (confidence < 0.3)
   - Interview did not address the area at all
   - Only briefly mentioned without substance
   - Provided information is irrelevant to the gap
</Analysis Criteria>

<Output Requirements>
- Provide clear judgment for each gap
- Provide specific evidence (quote from interview)
- Explain your reasoning
- Point out new knowledge gaps if discovered
</Output Requirements>`;
```

### Gap 状态扩展

在数据库中，扩展 gap 的状态字段：

```typescript
interface SageKnowledgeGap {
  // ... existing fields

  resolutionConfidence?: number; // 0-1, 解决的置信度
  resolutionEvidence?: string[]; // 解决的证据（访谈引用）
  missingAspects?: string[]; // 部分解决时，仍缺失的方面
}
```

### 优点

- ✅ **准确判断**: AI 深度分析而非简单匹配
- ✅ **置信度评分**: 量化解决程度
- ✅ **可解释性**: 提供推理过程和证据
- ✅ **发现新 Gap**: 访谈中可能暴露新的知识盲点
- ✅ **部分解决**: 支持渐进式填补知识空白

### 实现优先级

**Phase 1 (立即实施)**:
- 实现 AI 分析函数
- 替换字符串匹配逻辑
- 保存置信度和证据到数据库

**Phase 2 (1周后)**:
- UI 展示置信度和证据
- 支持用户手动调整 gap 状态
- 自动创建新发现的 gaps

---

## 综合实施计划

### 短期（立即实施）- Week 1-2

**优先级 P0**:
1. ✅ **智能 Gap 解决判断**
   - 实现 `analyzeGapResolution` 函数
   - 替换 `updateMemoryDocumentFromInterview` 中的字符串匹配
   - 添加置信度字段到数据库 schema

2. ✅ **Diff-based 增量更新 - Phase 1**
   - 实现 Markdown 解析器
   - 实现更新计划生成
   - 替换访谈更新逻辑中的"重新生成整个文档"

**预期效果**:
- Gap 解决判断准确率从 ~60% 提升到 ~90%
- 访谈更新成本降低 50-70%
- 更新质量提升（减少误改）

### 中期（1个月内）- Week 3-4

**优先级 P1**:
3. ✅ **分层记忆架构 - Phase 1**
   - 扩展 Memory Document schema，添加 Working Memory 字段
   - 新知识添加到 Working Memory 而非重新生成
   - 对话时同时使用 Core + Working Memory

4. ✅ **Diff-based 增量更新 - Phase 2**
   - 优化 section 更新策略
   - 添加变更预览 UI
   - 支持用户确认更新计划

**预期效果**:
- 支持快速添加新知识（无需重新生成）
- 用户可以预览和控制记忆更新
- 知识更新更加透明和可控

### 长期（2-3个月）- Month 2-3

**优先级 P2**:
5. ✅ **分层记忆架构 - Phase 2-3**
   - 实现"整合到核心记忆"功能
   - 引入 Episodic Memory
   - 提供记忆可视化界面

6. ✅ **高级功能**
   - 部分回滚功能
   - 知识冲突检测
   - 自动整合策略优化

**预期效果**:
- 完整的分层记忆系统
- 用户可以精细管理专家知识
- 系统自动优化记忆质量

---

## 技术实现细节

### Markdown 解析器

使用现有的 markdown 库，推荐 `remark` / `unified`:

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

function parseMemoryDocument(markdown: string): MemorySection[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const sections: MemorySection[] = [];
  let currentSection: MemorySection | null = null;
  let sectionStack: MemorySection[] = [];

  visit(tree, (node) => {
    if (node.type === "heading") {
      const section: MemorySection = {
        id: generateSectionId(),
        level: node.depth,
        title: extractText(node),
        content: "",
        subsections: [],
      };

      // 根据层级建立树状结构
      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= section.level) {
        sectionStack.pop();
      }

      if (sectionStack.length === 0) {
        sections.push(section);
      } else {
        sectionStack[sectionStack.length - 1].subsections.push(section);
      }

      sectionStack.push(section);
      currentSection = section;
    } else if (currentSection) {
      currentSection.content += nodeToMarkdown(node);
    }
  });

  return sections;
}
```

### 数据库 Schema 扩展

```prisma
model SageKnowledgeGap {
  // ... existing fields

  // 新增字段
  resolutionConfidence Float?   @default(0)
  resolutionEvidence   Json?    // string[]
  missingAspects       Json?    // string[]
}

model SageMemoryDocument {
  // ... existing fields

  // 新增字段 - 用于分层记忆
  workingMemory Json?  // WorkingMemoryItem[]
  episodicMemory Json? // EpisodicMemoryReference[]
}
```

### 成本估算

**当前方式**:
- 访谈更新: ~30-50K tokens (重新生成整个文档)
- Gap 判断: 0 tokens (字符串匹配)

**改进后**:
- 访谈更新: ~10-20K tokens (只更新相关 sections)
- Gap 判断: ~5-8K tokens (AI 分析)
- **总成本降低: ~40-50%**

**质量提升**:
- Gap 判断准确率: 60% → 90% (+50%)
- 更新质量: 减少误改，保持文档一致性
- 用户满意度: 更透明、可控的知识管理

---

## 总结

这三个策略互相补充：

1. **Diff-based 更新** → 解决"如何高效更新"的问题
2. **智能 Gap 判断** → 解决"如何准确评估"的问题
3. **分层记忆架构** → 解决"如何组织和管理"的问题

实施顺序：智能 Gap 判断 → Diff-based 更新 → 分层记忆架构

预期整体提升：
- 成本降低 40-50%
- 准确率提升 30-50%
- 用户体验显著改善
