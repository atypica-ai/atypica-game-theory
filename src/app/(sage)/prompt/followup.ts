import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { SageKnowledgeGapExtra, SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { SageKnowledgeGap } from "@/prisma/client";
import { Locale } from "next-intl";
import z from "zod";

export const resolveGapsSystemPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
你是知识缺口分析与知识提炼专家。你有两个任务：

# 任务 1: 分析已解决的知识缺口

对于每个知识缺口，请判断：
1. 访谈内容是否讨论了该缺口涉及的主题
2. 讨论是否提供了有价值的信息来填补该缺口

判断标准：
- 访谈内容充分讨论了该主题，提供了实质性的信息 → 标记为已解决
- 访谈内容仅略微涉及该主题 → 不标记为已解决

请客观分析，不要过度解读。

# 任务 2: 生成工作记忆 (Working Memory)

如果有知识缺口被解决，请从访谈中提炼出精炼的工作记忆内容：

**目标**：
- 提炼访谈中的**新知识**，用于填补已解决的知识缺口
- 这是临时记忆，之后会被整合到专家的核心记忆中

**内容要求**：
1. **结构化**: 使用 Markdown 格式，清晰的标题和列表
2. **精炼**: 不是完整对话记录，而是提取的关键知识点
3. **聚焦**: 只包含与已解决 gaps 相关的新知识
4. **实用**: 包含具体见解、案例、经验，避免空泛内容
5. **适度**: 控制在 500-1000 字以内

**格式示例**：
\`\`\`markdown
## [主题名称]

### 关键见解
- [具体的见解或发现]
- [另一个关键点]

### 实践经验
- [具体案例或经验]
- [实际应用场景]

### 注意事项
- [重要的注意点]
\`\`\`

**重要**：
- 如果没有 gap 被解决，workingMemory 返回空字符串
- 不要包含对话的元信息（如"受访者说"）
- 专注于知识本身，而非对话过程
`
    : `${promptSystemConfig({ locale })}
You are a knowledge gap analysis and knowledge distillation expert. You have two tasks:

# Task 1: Analyze Resolved Knowledge Gaps

For each knowledge gap, determine:
1. Whether the interview discusses the topic of this gap
2. Whether the discussion provides valuable information to fill this gap

Judgment criteria:
- Interview sufficiently discusses the topic with substantial information → Mark as resolved
- Interview only briefly touches on the topic → Do not mark as resolved

Please analyze objectively without over-interpreting.

# Task 2: Generate Working Memory

If any knowledge gaps are resolved, distill concise working memory content from the interview:

**Goal**:
- Extract **new knowledge** from the interview to fill resolved knowledge gaps
- This is temporary memory that will later be integrated into the expert's core memory

**Content Requirements**:
1. **Structured**: Use Markdown format with clear headings and lists
2. **Concise**: Not a full conversation transcript, but extracted key knowledge points
3. **Focused**: Only include new knowledge related to resolved gaps
4. **Practical**: Include specific insights, examples, and experience; avoid generic content
5. **Moderate**: Keep within 500-1000 words

**Format Example**:
\`\`\`markdown
## [Topic Name]

### Key Insights
- [Specific insight or finding]
- [Another key point]

### Practical Experience
- [Specific case or experience]
- [Real application scenario]

### Important Notes
- [Important consideration]
\`\`\`

**Important**:
- If no gaps are resolved, return empty string for workingMemory
- Don't include conversation metadata (like "interviewee said")
- Focus on the knowledge itself, not the conversation process
`;

export const resolveGapsUserPrologue = ({
  pendingGaps,
  interviewTranscript,
  locale,
}: {
  pendingGaps: (Pick<SageKnowledgeGap, "id" | "area" | "description" | "impact"> & {
    severity: SageKnowledgeGapSeverity;
    extra: SageKnowledgeGapExtra;
  })[];
  interviewTranscript: string;
  locale: Locale;
}) =>
  locale === "zh-CN"
    ? `
# 访谈内容
${interviewTranscript}

# 待分析的知识缺口
${pendingGaps
  .map(
    (gap) => `
## 缺口 #${gap.id}: ${gap.area}
描述: ${gap.description}
严重性: ${gap.severity}
影响: ${gap.impact}`,
  )
  .join("\n\n")}

# 任务

1. **分析已解决的缺口**：判断以上访谈内容是否解决了这些知识缺口，返回已解决的 gap ID 列表
2. **生成工作记忆**：如果有缺口被解决，从访谈中提炼精炼的工作记忆内容（Markdown 格式），包含关键见解、实践经验和具体案例`
    : `
# Interview Content
${interviewTranscript}

# Knowledge Gaps to Analyze
${pendingGaps
  .map(
    (gap) => `
## Gap #${gap.id}: ${gap.area}
Description: ${gap.description}
Severity: ${gap.severity}
Impact: ${gap.impact}`,
  )
  .join("\n\n")}

# Tasks

1. **Analyze resolved gaps**: Determine whether the interview content resolves these knowledge gaps and return the list of resolved gap IDs
2. **Generate working memory**: If any gaps are resolved, distill concise working memory content (Markdown format) from the interview, including key insights, practical experience, and specific examples`;

export const resolveGapsSchema = z.object({
  resolvedGapIds: z
    .array(z.number())
    .describe("List of gap IDs that were resolved by the interview content"),
  workingMemory: z
    .string()
    .describe(
      "Concise working memory content (Markdown format) that summarizes the NEW knowledge gained from this interview to fill the resolved gaps. Should be structured, focused, and ready to be integrated into core memory later. Include key insights, specific examples, and practical knowledge. Keep it under 1000 words.",
    ),
});
