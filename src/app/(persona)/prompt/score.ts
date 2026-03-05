import { Locale } from "next-intl";
import { z } from "zod/v3";
import { analysisDimensions } from "./analysis";

export const personaScoringPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
# 角色
你是一个精确的分析师，负责根据 AI 人设的 **prompt** 和 **tags**，对照以下【分析维度】进行打分。

# 分析维度
${analysisDimensions({ locale })}

# 任务
你的任务是评估给定的 AI 人设是否在每个维度下都包含了至少一个要点。

# 打分规则
- 对于每个维度，如果 AI 人设的 prompt 或 tags 中包含了该维度下的**至少一个**要点，则该维度得分为 1 分。
- 如果一个维度下的所有要点都没有在 prompt 或 tags 中体现，则该维度得分为 0 分。
- 你必须为每个维度打分，并提供打分依据。

# 输出格式
你必须以 JSON 格式输出结果。
`
    : `
# Role
You are a precise analyst responsible for scoring an AI Persona based on its **prompt** and **tags** against the following "Analysis Dimensions".

# Analysis Dimensions
${analysisDimensions({ locale })}

# Task
Your task is to evaluate whether the given AI Persona covers at least one point in each dimension.

# Scoring Rules
- For each dimension, if the AI Persona's prompt or tags cover at least one point under that dimension, the score for that dimension is 1.
- If no points under a dimension are reflected in the prompt or tags, the score for that dimension is 0.
- You must provide a score and a reason for each dimension.

# Output Format
You must output the result in JSON format.
`;

// Schema for persona scoring
export const personaScoringSchema = z.object({
  demographic: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  geographic: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  psychological: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  behavioral: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  needsPainPoints: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  techAcceptance: z.number().min(0).max(1).describe("1 if present, 0 if not"),
  socialRelations: z.number().min(0).max(1).describe("1 if present, 0 if not"),
});

// Schema for extracting persona attributes
// Note: Using .nullish() to accept null/undefined, then filter them out in code
export const personaAttributesSchema = z
  .object({
    role: z.enum(["consumer", "buyer", "expert"]).describe("Persona role type"),
    quote: z
      .string()
      .describe(
        "First-person quote showing personality and speaking style (~120 Chinese chars or ~80 English words)",
      )
      .nullish(),
    ageRange: z
      .enum(["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"])
      .describe(
        "CRITICAL: ONLY these 7 values are allowed: 0-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+. NEVER create custom ranges. If persona is 13 years old, use 0-17. If persona is 30 years old, use 25-34 or 35-44.",
      )
      .nullish(),
    location: z.string().describe("Location (format varies by language)").nullish(),
    industry: z.string().describe("Industry or domain").nullish(),
    title: z.string().describe("Job title or role").nullish(),
    organization: z.string().describe("Organization or company").nullish(),
    experience: z.string().describe("Experience level or seniority").nullish(),
  })
  .transform((data) => {
    // Filter out null, undefined, and empty string values
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== ""),
    );
  });

export const personaAttributesPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
从 AI 人设中提取关键属性。所有字段可选，只提取明确信息，无法推断的字段不要返回。

# role (必填)
- consumer: 个人消费者
- buyer: 企业采购者
- expert: 领域专家

# quote (重要)
用第一人称写这个 persona 会说的话，体现他的个性、偏好、语气和关注点。
- 长度：约 120 个中文字
- 风格：自然口语化，像真人在说话
- 内容：包含背景、态度、偏好、决策习惯

# 其他字段 (根据 role 选择 2-3 个)
- ageRange: 年龄段，只能从这 7 个值中选一个：0-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  (13 岁选 0-17，30 岁选 25-34 或 35-44，不能自创范围)
- location: 地区 (格式: "国家城市"，如 "中国上海")
- industry: 行业/领域
- title: 职位/角色
- organization: 组织/机构
- experience: 资历

# 规则
- 不要返回 null 或空字符串，无法确定的字段直接省略
- ageRange 严格从 7 个标准值中选择，不能自创
- 使用中文简洁表达
`
    : `
Extract key attributes from AI Persona. All fields optional, only extract clear information, omit uncertain fields.

# role (required)
- consumer: individual consumer
- buyer: B2B buyer
- expert: domain expert

# quote (important)
Write a first-person quote that this persona would say, reflecting their personality, preferences, tone, and concerns.
- Length: ~80 English words
- Style: Natural and conversational, like a real person speaking
- Content: Include background, attitude, preferences, decision-making habits

# Other fields (choose 2-3 based on role)
- ageRange: Choose ONE from: 0-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  (age 13 → 0-17, age 30 → 25-34 or 35-44, never create custom ranges)
- location: Location ("City, Country" format, e.g. "Shanghai, China")
- industry: Industry/domain
- title: Job title/role
- organization: Organization/institution
- experience: Seniority

# Rules
- Don't return null or empty strings, omit uncertain fields
- ageRange must be one of the 7 standard values, never custom
- Use concise English
`;
