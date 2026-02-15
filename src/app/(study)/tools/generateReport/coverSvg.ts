import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { AnalystReport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { stepCountIs, streamText, UserModelMessage } from "ai";
import { reportCoverPrologue, reportCoverSystem } from "./prompt";

/**
 * @deprecated
 */
export async function generateReportCoverSvg({
  report,
  studyLog,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  report: AnalystReport;
  studyLog: string;
  instruction: string;
} & AgentToolConfigArgs) {
  const response = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: defaultProviderOptions(),
    system: reportCoverSystem({ locale }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: reportCoverPrologue({ locale, studyLog, instruction }),
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
