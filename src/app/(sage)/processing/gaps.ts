import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { conversationGapAnalysisSystem } from "@/app/(sage)/prompt/gaps";
import { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { generateObject } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";

const conversationGapSchema = z.object({
  hasGap: z.boolean().describe("Whether a knowledge gap was detected"),
  gaps: z
    .array(
      z.object({
        area: z.string().describe("Knowledge area with gap"),
        severity: z.enum(Object.values(SageKnowledgeGapSeverity)).describe("Severity of the gap"),
        description: z.string().describe("What's missing or inadequate"),
        impact: z.string().describe("Impact on expert's capability"),
        suggestedQuestions: z.array(z.string()).describe("Questions to fill this gap").max(3),
      }),
    )
    .describe("List of detected knowledge gaps")
    .optional(),
});

/**
 * Analyze conversation to detect knowledge gaps
 * Called after sage responds to user question
 */
export async function analyzeConversationForGaps({
  userMessage,
  aiResponse,
  sage,
  locale,
  statReport,
  logger,
}: {
  userMessage: string;
  aiResponse: string;
  sage: { name: string; domain: string };
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<
  Array<{
    area: string;
    severity: SageKnowledgeGapSeverity;
    description: string;
    impact: string;
  }>
> {
  logger.info({ msg: "Analyzing knowledge gaps from conversation" });

  const result = await generateObject({
    model: llm("gemini-2.5-flash"), // Fast model for quick analysis
    schema: conversationGapSchema,
    system: conversationGapAnalysisSystem({ sage, locale }),
    prompt:
      locale === "zh-CN"
        ? `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

请分析上述对话，判断专家回答中是否存在知识空白。`
        : `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

Analyze the above conversation and determine if there are knowledge gaps in the expert's response.`,
    maxRetries: 2,
  });

  logger.info({
    msg: "Knowledge gaps analysis from conversation completed",
    knowledgeGapsCount: result.object.gaps?.length ?? 0,
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "analyze knowledge gaps from conversation",
    });
  }

  if (result.object.hasGap && result.object.gaps) {
    return result.object.gaps;
  }

  return [];
}
