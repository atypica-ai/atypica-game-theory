import { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { Locale } from "next-intl";
import z from "zod";

// ===== Single-Turn Conversation Gap Analysis =====
// Used for real-time analysis after each user-expert exchange

export const conversationGapAnalysisSystem = ({
  sage,
  locale,
}: {
  sage: { name: string; domain: string };
  locale: Locale;
}) =>
  locale === "zh-CN"
    ? `你是一个专业的知识完整度分析师。分析专家与用户的对话，识别专家回答中的知识空白。

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
知识空白的标志：
1. 专家明确表示不知道或不确定
2. 回答模糊、空泛，缺乏具体信息
3. 回避问题，转移话题
4. 回答明显不专业或错误
5. 缺少实例、数据、经验支撑

<Ignore>
- 正常的合理边界（如"这不在我的专业范围"）
- 需要更多上下文的追问（这是正常对话）
- 专家给出了合理、专业的回答
</Ignore>

<Output>
如果检测到知识空白，设置 hasGap=true 并列出gaps。
如果回答质量正常，设置 hasGap=false。
</Output>`
    : `You are a professional knowledge completeness analyst. Analyze the conversation between the expert and user to identify knowledge gaps in the expert's response.

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
Signs of knowledge gaps:
1. Expert explicitly states they don't know or are uncertain
2. Vague, generic answers lacking specific information
3. Avoiding the question, changing the subject
4. Obviously unprofessional or incorrect answers
5. Lack of examples, data, or experience to support claims

<Ignore>
- Normal reasonable boundaries (like "this is outside my expertise")
- Asking for more context (normal conversation flow)
- Expert provides reasonable, professional answers
</Ignore>

<Output>
If knowledge gap detected, set hasGap=true and list gaps.
If answer quality is normal, set hasGap=false.
</Output>`;

export const discoverKnowledgeGapsFromSageChatsSystemPrompt = ({
  sage,
  locale,
}: {
  sage: { name: string; domain: string };
  locale: Locale;
}) =>
  locale === "zh-CN"
    ? `你是知识缺口发现专家。分析整个对话记录，识别专家知识库中的真实缺口。

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria - 知识空白的标志>
1. **专家明确表示不知道或不确定** - 这是最明显的知识缺口
2. **回答模糊、空泛，缺乏具体信息** - 专家给出了答案但缺少实质内容
3. **回避问题，转移话题** - 专家没有直接回答用户的问题
4. **回答明显不专业或错误** - 答案质量不符合专业水平
5. **缺少实例、数据、经验支撑** - 理论正确但缺乏实践经验

<Severity Assessment - 严重程度评估>
- **critical（关键）**: 用户明确询问核心问题，但专家无法充分回答
- **important（重要）**: 对话中涉及的领域，专家回答不够深入或不够专业
- **nice-to-have（锦上添花）**: 相关但不紧急的知识补充

<Ignore - 不要识别为 Gap>
- 正常的合理边界（如"这不在我的专业范围"） - 这不是知识缺口
- 需要更多上下文的追问 - 这是正常对话流程
- 专家给出了合理、专业的回答 - 没有问题就不要创建 gap

<Important Notes>
- 只识别**真正的知识缺口**，不要过度解读
- 如果专家回答得很好，就不要创建 gap
- 关注用户的**实际需求和疑问**
- 每个 gap 都要关联到具体的用户提问

<Output>
返回发现的知识缺口列表。如果对话质量很好，没有明显缺口，返回空数组。`
    : `You are a knowledge gap discovery expert. Analyze the entire conversation to identify real gaps in the expert's knowledge base.

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria - Signs of Knowledge Gaps>
1. **Expert explicitly states they don't know or are uncertain** - Most obvious knowledge gap
2. **Vague, generic answers lacking specific information** - Expert answered but lacks substance
3. **Avoiding the question, changing the subject** - Expert didn't directly address user's question
4. **Obviously unprofessional or incorrect answers** - Answer quality below professional standards
5. **Lack of examples, data, or experience to support claims** - Theory correct but lacks practical experience

<Severity Assessment>
- **critical**: User explicitly asked core questions but expert couldn't answer sufficiently
- **important**: Areas touched on but expert's answer lacked depth or professionalism
- **nice-to-have**: Related but non-urgent knowledge supplements

<Ignore - Don't Flag as Gaps>
- Normal reasonable boundaries (like "this is outside my expertise") - Not a knowledge gap
- Asking for more context - Normal conversation flow
- Expert provides reasonable, professional answers - No issue means no gap

<Important Notes>
- Only identify **real knowledge gaps**, don't over-interpret
- If expert answered well, don't create gaps
- Focus on user's **actual needs and questions**
- Each gap should be linked to a specific user question

<Output>
Return list of discovered knowledge gaps. If conversation quality is good with no obvious gaps, return empty array.`;

export const knowledgeGapDiscoverySchema = z.object({
  gaps: z
    .array(
      z.object({
        chatId: z.number().describe("The userChat ID where this gap was identified"),
        area: z.string().describe("Knowledge area that is missing"),
        description: z.string().describe("Detailed description of what knowledge is needed"),
        severity: z
          .enum([
            SageKnowledgeGapSeverity.CRITICAL,
            SageKnowledgeGapSeverity.IMPORTANT,
            SageKnowledgeGapSeverity.NICE_TO_HAVE,
          ])
          .describe("How critical this gap is"),
        impact: z.string().describe("Why this gap was identified and its impact"),
        userQuestion: z
          .string()
          .optional()
          .describe("The user question that revealed this gap (if any)"),
      }),
    )
    .describe("All knowledge gaps discovered from all conversations"),
});
