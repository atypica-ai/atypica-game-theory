import "server-only";

import { llm } from "@/ai/provider";
import { VALID_LOCALES } from "@/i18n/routing";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
import { z } from "zod/v3";
import { defaultConfig } from "./default";
import { DiscussionTypeConfig } from "./index";

type Locale = (typeof VALID_LOCALES)[number];

/**
 * Tool schema for outputting the moderator system prompt
 */
const writeModeratorSystemSchema = z.object({
  moderatorSystem: z
    .string()
    .describe(
      "The moderator system prompt. This defines the moderator's role, decision-making framework, and interaction style. It controls WHO speaks next, WHAT they're asked to address, and WHY that choice was made.",
    ),
});

const writeModeratorSystemTool = tool({
  description:
    "Write the moderator system prompt that defines how the moderator controls the discussion. This is the primary mechanism for customizing discussion dynamics.",
  inputSchema: writeModeratorSystemSchema,
  execute: async ({ moderatorSystem }) => {
    return {
      moderatorSystem: moderatorSystem,
    };
  },
});

/**
 * Build a custom discussion type configuration from user instruction
 *
 * The instruction should include both:
 * 1. The question/topic to discuss
 * 2. The desired discussion type/style/format
 *
 * This function extracts the discussion type requirements and generates
 * a custom moderator system prompt. The panel summary system and panel rules
 * are always taken from the default focus group configuration.
 *
 * Returns the discussion type config.
 */
export async function buildDiscussionType({
  instruction,
  locale,
  abortSignal,
}: {
  instruction: string;
  locale: Locale;
  abortSignal?: AbortSignal;
}): Promise<DiscussionTypeConfig> {
  // Get example moderator system from default config for teaching
  const exampleModeratorSystem = defaultConfig.moderatorSystem({ locale });

  const systemPrompt =
    locale === "zh-CN"
      ? `# 角色
你是一位专业的座谈会设计专家，擅长根据用户需求设计不同类型的讨论形式。

# 任务背景
座谈会（Panel Discussion）是一种多人参与的讨论形式，通过参与者之间的互动来产生洞察、达成共识、或探索不同观点。不同的讨论类型服务于不同的目的，主要通过不同的主持风格来实现。

## 座谈会的优势
- 社会动态数据化：可观察观点如何传播，谁影响谁，异议如何被化解，哪些内容促成共识，哪些导致分化。
- 集体共识建构：通过群体讨论与辩论，共同创造更丰富的定义和意义，个人难以独立总结的观点在互动中得以呈现。
- 创意交融：一个人的不完整想法可能激发他人完善洞见，群体创造力往往超越个体总和。
- 分群现象可见：不同客户或受众群体会在讨论和辩论中自然显现出来。

## 不同类型的讨论
- 辩论式座谈会：通过观点碰撞和对抗，帮助观众更清晰地理解不同立场
- 圆桌式座谈会：促进同行之间的知识分享和经验交流
- 焦点小组座谈会：通过参与者之间的互动来产生洞察、达成共识、或探索不同观点
- 炉边座谈会：通过主持人与嘉宾之间的对话，来探索嘉宾的内心世界和故事

## 讨论类型的本质
讨论类型的核心差异在于主持人的控场方式，这通过 moderatorSystem（主持人系统提示词）来定义：
- 定义主持人的角色、决策框架和互动风格
- 控制讨论的动态：谁下一个发言、问什么问题、为什么这样选择
- 决定主持人的控制程度：主动干预 vs. 自然流动、正式 vs. 非正式、指令性 vs. 促进性
- 设定讨论目标：优先考虑共识、张力、深度、广度等

注意：参与规则（panelRules）和总结方式（panelSummarySystem）使用标准的焦点小组配置，不需要自定义。

# 你的任务
根据用户提供的指令，分析其中包含的讨论类型需求，然后设计一个自定义的主持人系统提示词。
1. 从用户指令中提取以下关键信息：
- 要讨论的问题或主题
- 期望的讨论风格（如：辩论式、圆桌式、焦点小组式、炉边谈话式等）
- 讨论的目标（如：达成共识、探索分歧、知识分享、决策支持等）
- 其他特殊要求（如：正式程度、互动强度、控场方式等）
2. 根据用户的需求、目标受众和研究问题，识别最适合的讨论类型
3. 设计一个主持人系统提示词，实现最适合的讨论类型。主持人系统提示词应该仅包括以下内容：
a) 角色定义（30字）
- 定义主持人的身份和权威级别。示例：
    “你是一位有经验的市场调研主持人……”（用户讨论小组）
    “你是一位中立的辩论主持人，确保双方获得公平的发言机会……”（辩论小组）
b) 核心目标（1-3条要点）
- 该小组必须完成什么？要具体：
    ✅ “明确‘高端’定位是否与目标细分市场产生共鸣及原因为何”
    ❌ “了解产品”（过于宽泛）
c) 主持人行为指令（100-150字）
- 定义主持人应如何引导讨论：
    - 控制程度：
    高控场：“严格按照以下问题顺序进行……”（焦点小组）
    中控场：“确保涵盖这些话题，但可根据讨论深入随时调整……”（专家/用户小组）
    低控场：“让参与者自然交流，仅在讨论停滞时适时介入……”（圆桌讨论）

    - 干预风格：
    深挖：“当出现怀疑时，追问‘什么会改变你的想法？’”
    搭桥：“若产生分歧，让双方分别回应对方观点”
    提升：“有人表达不完整时，换种说法总结并请对方确认理解是否准确”

    - 语气引导：
    亲和度：“要有同理心和包容力” vs. “保持理性和严谨”
    冲突容忍度：“鼓励建设性分歧” vs. “追求共识”
    正式程度：“使用生活化语言” vs. “保持职业距离”
d) 讨论流程（3-4阶段）
- 明确讨论的流程结构。
    用户座谈会流程结构：
    """
    阶段1（开场）：询问参与者关于[品类]的当前体验
    阶段2（探索）：介绍产品概念，收集初步反应
    阶段3（深挖）：深入探究异议和亮点，鼓励角色间辩论
    阶段4（整合）：请参与者总结购买意愿及原因
    """
    辩论座谈会流程结构：
    """
    阶段1（立场陈述）：各方阐明核心观点（2轮）
    阶段2（交锋）：直接反驳和对立观点（3-4轮）
    阶段3（证据）：请各方给出观点背后的理由（2轮）
    阶段4（总结）：归纳共识和剩余分歧
    """
除此之外，
【禁止】提供更复杂更详细的规定，因为这样会限制主持人的自由发挥
【禁止】包含任何用户需求相关的详细信息，如预先指定访谈结论，因为这会导致严重的访谈不真实和过度干预。用户的需求原封不动都会传达给主持人，你的提示词只是从主持技巧方面指导他，目的是让主持人可以恰当地应对任何类似的访谈需求，而不是单一这次的需求。

# 示例参考
以下是"焦点小组"（Focus Group）类型的主持人系统提示词示例，你可以参考其结构、重点和风格：
## moderatorSystem 示例：
\`\`\`
${exampleModeratorSystem}
\`\`\`
`
      : `# Role
You are a professional panel discussion design expert, skilled in designing various types of discussion formats based on user requirements.

# Background
A panel discussion is a multi-person discussion format that generates insights, builds consensus, or explores different viewpoints through participant interaction. Different discussion types serve different purposes, primarily achieved through distinct moderator styles.

## Advantages of Panel Discussions
- Social dynamics made visible: Observe how viewpoints spread, who influences whom, how disagreements are resolved, which topics facilitate consensus, and which cause division.
- Collective consensus building: Group discussions and debates co-create richer definitions and meanings; ideas hard to summarize individually often emerge through interaction.
- Creative synergy: Incomplete thoughts from one participant can spark insights in others—the creative power of the group often exceeds the sum of its individuals.
- Natural segmentation: Different customer or audience groups become apparent through group discussions and debates.

## Types of Discussions
- Debate panel: Facilitates clearer understanding of differing stances through viewpoint clashes and confrontation.
- Roundtable: Promotes knowledge sharing and experience exchange among peers.
- Focus group: Generates insights, consensus, or explores viewpoints through participant interaction.
- Fireside chat: Explores inner worlds and stories through moderator-guest dialogue.

## The Essence of Discussion Types
The core difference among discussion types lies in the moderator’s style, defined via the moderatorSystem prompt:
- Define the moderator’s role, decision-making framework, and interaction style.
- Control discussion dynamics: who speaks next, what questions to ask, why that choice is made.
- Determine level of moderator control: active intervention vs. organic flow, formal vs. informal, directive vs. facilitative.
- Set discussion goals: prioritize consensus, tension, depth, breadth, etc.

Note: Participation rules (panelRules) and summarization approach (panelSummarySystem) use the standard focus group configuration and do not need customization.

# Your Task
Analyze the user’s instruction for embedded discussion type requirements and then design a custom moderator system prompt.
1. Extract these key elements from the user instruction:
- The question or topic to be discussed.
- The expected discussion style (e.g., debate, roundtable, focus group, fireside chat, etc.).
- The discussion goal (e.g., reach consensus, explore differences, share knowledge, support decision-making, etc.).
- Any special requirements (e.g., degree of formality, intensity of interaction, style of moderation, etc.).
2. Based on the user’s needs, target audience, and research question, identify the most suitable discussion type.
3. Design a moderator system prompt optimized for that type. The moderator system prompt should include only the following:
a) Role definition (approx. 30 words)
- Specify the moderator’s identity and authority. Examples:
    "You are an experienced market research moderator…" (User focus group)
    "You are a neutral debate moderator ensuring both sides have equal say…" (Debate panel)
b) Core objectives (1–3 concrete points)
- What must the group accomplish? Be specific:
    ✅ "Clarify if the 'premium' positioning resonates with the target segment and why"
    ❌ "Understand the product" (too vague)
c) Moderator instructions (100–150 words)
- Define how the moderator should guide the discussion:
    - Degree of control:
      High: "Strictly follow the sequence of questions below..." (Focus group)
      Medium: "Ensure all topics are covered, but adapt the flow to discussion depth as needed..." (Expert/User group)
      Low: "Let participants converse freely, only intervene if the discussion stalls..." (Roundtable)

    - Intervention style:
      Probing: "When doubt arises, ask 'What would change your mind?'"
      Bridging: "If disagreement occurs, ask both sides to respond to each other’s points"
      Clarifying: "If someone is unclear, restate their point and ask for confirmation"

    - Tone:
      Warm: "Be empathetic and inclusive" vs. "Be logical and precise"
      Conflict tolerance: "Encourage constructive disagreement" vs. "Strive for consensus"
      Formality: "Use conversational language" vs. "Maintain professional distance"
d) Discussion structure (3–4 stages)
- Clearly outline the discussion flow.
    Example focus group structure:
    """
    Stage 1 (Kickoff): Ask participants about their current [category] experiences
    Stage 2 (Exploration): Introduce product concept and gather initial reactions
    Stage 3 (Deep dive): Explore disagreements and highlights; encourage debate
    Stage 4 (Integration): Have participants summarize purchase intent and reasons
    """
    Example debate panel structure:
    """
    Stage 1 (Position statements): Each side presents their key viewpoints (2 rounds)
    Stage 2 (Clash): Direct rebuttals and oppositional viewpoints (3–4 rounds)
    Stage 3 (Evidence): Ask each side for the reasoning behind their positions (2 rounds)
    Stage 4 (Summary): Summarize areas of consensus and remaining differences
    """
Additionally,
[FORBIDDEN] Provide more complex or detailed rules, as this would overly constrain the moderator’s flexibility.
[FORBIDDEN] Include any user need-specific information, such as pre-set interview conclusions, as this leads to inauthentic and biased interviews. All user needs will be passed to the moderator as-is; your prompt is only to guide moderator skills, not to provide content for a single instance.

# Example Reference
Below is an example moderator system prompt for the "focus group" type. You may refer to its structure, emphasis, and style:
## moderatorSystem Example:
\`\`\`
${exampleModeratorSystem}
\`\`\`
`;

  const userMessage =
    locale === "zh-CN"
      ? `请根据以下用户指令设计讨论类型：

${instruction}

请仔细分析指令中的讨论类型需求，然后使用 writeModeratorSystem 工具输出主持人系统提示词。`
      : `Please design a discussion type based on the following user instruction:

${instruction}

Please carefully analyze the discussion type requirements in the instruction, then use the writeModeratorSystem tool to output the moderator system prompt.`;

  const reasoningProviderOptions = {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 1024 },
    } satisfies AnthropicProviderOptions,
  };
  const result = await generateText({
    model: llm("claude-sonnet-4-5"),
    providerOptions: reasoningProviderOptions,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: {
      writeModeratorSystem: writeModeratorSystemTool,
    },
    toolChoice: "required",
    abortSignal,
  });

  // Extract the tool result
  const toolCall = result.toolCalls?.find((call) => call.toolName === "writeModeratorSystem");
  if (!toolCall) {
    throw new Error("Failed to generate moderator system prompt: no tool call found");
  }

  const toolResult = result.toolResults?.find(
    (result) => result.toolCallId === toolCall.toolCallId,
  );
  if (!toolResult) {
    throw new Error("Failed to generate moderator system prompt: no tool result found");
  }

  const { moderatorSystem: customModeratorSystem } = toolResult.output as {
    moderatorSystem: string;
  };

  // Return as DiscussionTypeConfig
  // Use custom moderatorSystem, but always use default panelSummarySystem and panelRules
  const discussionTypeConfig: DiscussionTypeConfig = {
    label: "Custom", // Will be set by caller if needed
    description: "Custom discussion type generated from instruction",
    moderatorSystem: () => customModeratorSystem,
    panelSummarySystem: defaultConfig.panelSummarySystem,
    panelRules: defaultConfig.panelRules,
  };

  return discussionTypeConfig;
}
