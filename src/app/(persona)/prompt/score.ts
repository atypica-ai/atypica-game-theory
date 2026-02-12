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
export const personaAttributesSchema = z.object({
  role: z.enum(["consumer", "buyer", "expert"]).describe("Persona role type"),
  ageRange: z.enum(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]).optional(),
  location: z.string().describe("Location (format varies by language)").optional(),
  industry: z.string().describe("Industry or domain").optional(),
  title: z.string().describe("Job title or role").optional(),
  organization: z.string().describe("Organization or company").optional(),
  experience: z.string().describe("Experience level or seniority").optional(),
});

export const personaAttributesPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
# 角色
你是一个专业的用户画像分析师，负责从 AI 人设的 **name**、**prompt** 和 **tags** 中提取关键属性信息。

# 任务
分析给定的 AI 人设，提取以下属性字段。**所有字段都是可选的**，只提取能从内容中明确推断出的信息。

# 属性字段说明

## role (角色类型) - 必须判断
- **consumer**: 2C 消费者（个人用户、终端消费者）
- **buyer**: 2B 企业采购者（企业决策者、采购经理）
- **expert**: 领域专家（提供专业意见的专家、学者）

## 根据 role 提取不同字段

### 如果是 consumer (消费者)，优先提取：
- **ageRange**: 年龄段 (18-24, 25-34, 35-44, 45-54, 55-64, 65+)
- **location**: 地区，格式为 "国家城市"（如 "中国上海"、"美国纽约"）
- **title**: 职业角色，使用中文（如 "全职妈妈", "大学生", "白领"）

### 如果是 buyer (企业采购者)，优先提取：
- **industry**: 所在行业，使用中文（如 "金融科技", "制造业", "电商"）
- **title**: 职位，使用中文（如 "IT采购经理", "HR总监", "CTO"）
- **organization**: 组织规模或类型，使用中文（如 "500-1000人", "上市公司"）

### 如果是 expert (专家)，优先提取：
- **industry**: 专业领域，使用中文（如 "人工智能", "心血管医学", "知识产权法"）
- **title**: 职位，使用中文（如 "高级研究员", "主任医师", "合伙人律师"）
- **organization**: 所属机构，使用中文（如 "清华大学", "协和医院"）
- **experience**: 资历，使用中文（如 "10年经验", "资深专家"）

# 提取规则
1. **只提取明确信息**：如果某个字段无法从内容中推断，则不返回该字段
2. **role 字段必须判断**：必须确定是 consumer、buyer 还是 expert
3. **标准化表达**：
   - 年龄段使用标准格式
   - 地区使用 "国家城市" 格式（如 "中国上海"、"美国纽约"）
   - 行业、职位、组织等使用中文简洁表达
4. **避免过度推断**：不要基于刻板印象或假设填充信息

# 输出格式
以 JSON 格式输出结果，只包含能确定的字段。
`
    : `
# Role
You are a professional persona analyst responsible for extracting key attributes from an AI Persona's **name**, **prompt**, and **tags**.

# Task
Analyze the given AI Persona and extract the following attribute fields. **All fields are optional** - only extract information that can be clearly inferred from the content.

# Attribute Fields

## role (Persona Type) - Must determine
- **consumer**: B2C consumer (individual user, end consumer)
- **buyer**: B2B buyer (enterprise decision maker, procurement manager)
- **expert**: Domain expert (specialist who provides professional opinions)

## Extract different fields based on role

### If consumer, prioritize:
- **ageRange**: Age range (18-24, 25-34, 35-44, 45-54, 55-64, 65+)
- **location**: Location in "City, Country" format (e.g. "San Francisco, USA", "Toronto, Canada")
- **title**: Job/role (e.g. "Working parent", "Recent graduate", "Freelance designer")

### If buyer, prioritize:
- **industry**: Industry (e.g. "Enterprise Software", "Financial Services", "Manufacturing")
- **title**: Job title (e.g. "Director of IT", "Chief Procurement Officer", "VP of Engineering")
- **organization**: Organization size/type (e.g. "Fortune 500", "Growth-stage startup", "500+ employees")

### If expert, prioritize:
- **industry**: Domain/field (e.g. "Computer Vision", "Oncology", "Corporate Law")
- **title**: Job title (e.g. "Associate Professor", "Board-certified Surgeon", "Senior Counsel")
- **organization**: Institution (e.g. "MIT", "Cleveland Clinic", "Big Four consulting")
- **experience**: Seniority (e.g. "10+ years in field", "Established practitioner")

# Extraction Rules
1. **Only extract clear information**: If a field cannot be inferred from content, do not return it
2. **role field is required**: Must determine if consumer, buyer, or expert
3. **Standardize expressions**:
   - Use standard age range format
   - Use "City, Country" format for location, in English (e.g. "Shanghai, China")
   - Use concise English expressions for industry, title, organization, and experience
4. **Avoid over-inference**: Don't fill information based on stereotypes or assumptions

# Output Format
Output in JSON format, including only fields that can be determined.
`;
