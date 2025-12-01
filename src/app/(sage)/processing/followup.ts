import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  makeSageInterviewPlanSystemPrompt,
  sageInterviewPlanSchema,
} from "@/app/(sage)/prompt/chat";
import { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { SageKnowledgeGap } from "@/prisma/client";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

/**
 * Generate interview plan for supplementary interview
 */
export async function makeSageInterviewPlan({
  sage,
  pendingGaps,
  locale,
  // logger,
  statReport,
  abortSignal,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  pendingGaps: Array<
    Pick<SageKnowledgeGap, "area" | "description" | "impact"> & {
      severity: SageKnowledgeGapSeverity;
    }
  >;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}): Promise<{
  purpose: string;
  focusAreas: string[];
  questions: Array<{ question: string; purpose: string; followUps: string[] }>;
}> {
  const result = await generateObject({
    // model: llm("claude-haiku-4-5"),
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto", // 'auto' | 'detailed'
        reasoningEffort: "minimal", // 'minimal' | 'low' | 'medium' | 'high'
      } satisfies OpenAIResponsesProviderOptions,
    },
    schema: sageInterviewPlanSchema,
    system: makeSageInterviewPlanSystemPrompt({ sage, pendingGaps, locale }),
    prompt:
      locale === "zh-CN"
        ? "请生成补充访谈计划。"
        : "Please generate the supplementary interview plan.",
    maxRetries: 3,
    abortSignal,
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "make sage interview plan",
    });
  }

  return result.object;
}
