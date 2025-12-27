import "server-only";

import { reportCoverPrologue, reportCoverSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { Analyst, AnalystReport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { stepCountIs, streamText, UserModelMessage } from "ai";

export async function generateReportCoverSvg({
  analyst,
  report,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  analyst: Analyst;
  report: AnalystReport;
  instruction: string;
} & AgentToolConfigArgs) {
  const response = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: defaultProviderOptions,
    system: reportCoverSystem({ locale }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: reportCoverPrologue({ locale, analyst, instruction }),
          },
        ],
      },
    ] as UserModelMessage[],
    stopWhen: stepCountIs(1),
    maxOutputTokens: 10000,

    onFinish: async ({ text, usage }) => {
      logger.info("Report cover SVG generated");
      await prisma.analystReport.update({
        where: { id: report.id },
        data: { coverSvg: text },
      });
      // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
      const totalTokens =
        (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
      if (totalTokens > 0 && statReport) {
        await statReport("tokens", totalTokens, {
          reportedBy: "generateReport tool",
          part: "coverSvg",
          usage,
        });
      }
    },

    onError: ({ error }) => {
      logger.warn(`Cover SVG error: ${(error as Error).message}`);
    },

    abortSignal,
  });
  await response.consumeStream();
}
