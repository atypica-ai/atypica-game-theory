import { llm } from "@/ai/provider";
import { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import z from "zod";

/**
 * Generate interview plan for supplementary interview
 */
export async function generateInterviewPlan({
  sage,
  knowledgeGaps,
  locale,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  knowledgeGaps: Array<{
    area: string;
    severity: SageKnowledgeGapSeverity;
    description: string;
    impact: string;
    suggestedQuestions: string[];
  }>;
  locale: Locale;
}): Promise<{
  purpose: string;
  focusAreas: string[];
  questions: Array<{ question: string; purpose: string; followUps: string[] }>;
}> {
  const interviewPlanSchema = z.object({
    purpose: z.string().describe("Purpose of this supplementary interview"),
    focusAreas: z.array(z.string()).describe("Key focus areas for the interview"),
    questions: z.array(
      z.object({
        question: z.string().describe("Interview question"),
        purpose: z.string().describe("Purpose of asking this question"),
        followUps: z.array(z.string()).describe("Potential follow-up questions (2-3 questions)"),
      }),
    ),
  });

  const result = await generateObject({
    model: llm("claude-sonnet-4"),
    schema: interviewPlanSchema,
    system:
      locale === "zh-CN"
        ? `你是专业的访谈策划专家，负责为专家知识体系补充设计访谈计划。

<专家信息>
名称: ${sage.name}
领域: ${sage.domain}
已有专长: ${sage.expertise.join(", ")}
</专家信息>

<知识空白>
${knowledgeGaps.map((gap, i) => `${i + 1}. ${gap.area} (${gap.severity})\n   ${gap.description}\n   影响: ${gap.impact}`).join("\n\n")}
</知识空白>

<任务>
设计一个补充访谈计划，帮助填补上述知识空白。访谈计划应该：
1. 明确访谈目的
2. 确定重点关注领域（从知识空白中提炼）
3. 设计3-5个核心问题，每个问题配备2-3个追问
4. 问题应该开放式、具体，能够引导出深度知识
</任务>`
        : `You are a professional interview planning expert, responsible for designing interview plans to supplement expert knowledge systems.

<Expert Information>
Name: ${sage.name}
Domain: ${sage.domain}
Existing Expertise: ${sage.expertise.join(", ")}
</Expert Information>

<Knowledge Gaps>
${knowledgeGaps.map((gap, i) => `${i + 1}. ${gap.area} (${gap.severity})\n   ${gap.description}\n   Impact: ${gap.impact}`).join("\n\n")}
</Knowledge Gaps>

<Task>
Design a supplementary interview plan to help fill the above knowledge gaps. The interview plan should:
1. Clearly state the interview purpose
2. Identify key focus areas (extracted from knowledge gaps)
3. Design 3-5 core questions, each with 2-3 follow-up questions
4. Questions should be open-ended, specific, and able to elicit deep knowledge
</Task>`,
    prompt:
      locale === "zh-CN"
        ? "请生成补充访谈计划。"
        : "Please generate the supplementary interview plan.",
    maxRetries: 3,
  });

  return result.object;
}
