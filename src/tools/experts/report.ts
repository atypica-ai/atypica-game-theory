import { Analyst, AnalystReport } from "@/data";
import openai from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { reportHTMLPrologue, reportHTMLSystem } from "@/prompt";
import { reportCoverPrologue, reportCoverSystem } from "@/prompt/report";
import { PlainTextToolResult } from "@/tools/utils";
import { FinishReason, Message, streamText, tool } from "ai";
import { z } from "zod";
import { StatReporter } from "..";

export interface GenerateReportResult extends PlainTextToolResult {
  analystId: number;
  reportId: number;
  plainText: string;
}

export const generateReportTool = ({
  abortSignal,
  statReport,
}: {
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) =>
  tool({
    description: "为调研主题生成报告",
    parameters: z.object({
      analystId: z.number().describe("调研主题的 ID"),
      instruction: z.string().describe("用户指令，包括额外的报告内容和样式等").default(""),
      regenerate: z.boolean().describe("重新生成报告").default(false),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ analystId, instruction, regenerate }): Promise<GenerateReportResult> => {
      let report = await prisma.analystReport.findFirst({
        where: { analystId },
        orderBy: { createdAt: "desc" },
      });
      if (report?.generatedAt && !regenerate) {
        return {
          analystId: analystId,
          reportId: report.id,
          plainText: `Report for analyst ${analystId} is generated`,
        };
      }
      if (report && !report.generatedAt) {
        // 复用这个没完成的 report
        report = await prisma.analystReport.update({
          where: { id: report.id },
          data: { onePageHtml: "" },
        });
      } else {
        const token = generateToken();
        report = await prisma.analystReport.create({
          data: { analystId, token, coverSvg: "", onePageHtml: "" },
        });
      }
      const analyst = await prisma.analyst.findUniqueOrThrow({
        where: { id: analystId },
        include: {
          interviews: {
            where: { conclusion: { not: "" } },
          },
        },
      });
      try {
        await generateReport({
          analyst,
          report,
          instruction,
          abortSignal,
          statReport,
        });
        // 更新一下 report 的数据
        report = await prisma.analystReport.findUniqueOrThrow({
          where: { id: report.id },
        });
        await generateCover({
          analyst,
          report,
          instruction,
          abortSignal,
          statReport,
        });
        return {
          analystId: analystId,
          reportId: report.id,
          plainText: `Report for analyst ${analystId} is generated`,
        };
      } catch (error) {
        console.debug(error);
        return {
          analystId: analystId,
          reportId: report.id,
          plainText: `Report for analyst ${analystId} failed to generate`,
        };
      }
    },
  });

export const throttleSaveHTML = (() => {
  let timerId: NodeJS.Timeout | null = null;

  return async (
    reportId: number,
    onePageHtml: string,
    { immediate }: { immediate?: boolean } = {},
  ) => {
    if (immediate) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      saveNow();
      return;
    }

    if (!timerId) {
      timerId = setTimeout(() => {
        timerId = null;
        saveNow();
      }, 5000); // 5秒节流
    }

    async function saveNow() {
      try {
        await prisma.analystReport.update({
          where: { id: reportId },
          data: { onePageHtml },
        });
        console.log(`Report [${reportId}] HTML persisted successfully`);
      } catch (error) {
        console.log(`Report [${reportId}] Error persisting HTML:`, error);
      }
    }
  };
})();

async function generateReport({
  analyst,
  report,
  instruction,
  abortSignal,
  statReport,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  report: AnalystReport;
  instruction: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) {
  let onePageHtml = "";
  let messages: Omit<Message, "id">[] = [{ role: "user", content: reportHTMLPrologue(analyst) }];

  while (true) {
    const {
      finishReason,
      // content,
    } = await new Promise<{
      finishReason: FinishReason;
      content: string;
    }>((resolve, reject) => {
      const response = streamText({
        model: openai("claude-3-7-sonnet"),
        providerOptions: {
          openai: { stream_options: { include_usage: true } },
        },
        system: reportHTMLSystem(instruction),
        messages: messages,
        maxSteps: 1,
        maxTokens: 100000,
        onError: ({ error }) => {
          console.log(`Report [${report.id}] HTML generation Error:`, error);
          reject(error);
        },
        onChunk: async ({ chunk }) => {
          // console.log(`[${report.id}] One Page HTML:`, JSON.stringify(chunk));
          if (chunk.type === "text-delta") {
            onePageHtml += chunk.textDelta.toString();
            await throttleSaveHTML(report.id, onePageHtml);
          }
        },
        onFinish: async (result) => {
          resolve({
            finishReason: result.finishReason,
            content: result.text,
          });
          console.log(`Report [${report.id}] HTML generated, finishReason: ${result.finishReason}`);
          if (result.usage.totalTokens > 0 && statReport) {
            await statReport("tokens", result.usage.totalTokens, {
              reportedBy: "generateReport tool",
              part: "onePageHtml",
            });
          }
        },
        abortSignal,
      });

      response.consumeStream().catch((error) => reject(error));
    });

    await throttleSaveHTML(report.id, onePageHtml, { immediate: true });

    if (finishReason === "length") {
      // messages.push({ role: "assistant", content: content });
      // messages.push({ role: "user", content: "continue" });
      messages = [
        { role: "user", content: reportHTMLPrologue(analyst) },
        { role: "assistant", content: onePageHtml },
        {
          role: "user",
          content:
            "我看到您的回复因为长度限制被截断了。请继续生成剩余的网页内容，无需重复已经生成的部分，直接接着上文继续完成。",
        },
      ];
      continue;
    } else {
      await prisma.analystReport.update({
        where: { id: report.id },
        data: { generatedAt: new Date() },
      });
      break;
    }
  }
}

async function generateCover({
  analyst,
  report,
  instruction,
  abortSignal,
  statReport,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  report: AnalystReport;
  instruction: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) {
  const response = streamText({
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: reportCoverSystem(instruction),
    messages: [{ role: "user", content: reportCoverPrologue(analyst) }],
    maxSteps: 1,
    maxTokens: 30000,
    onError: (error) => console.log(`[${report.id}] Cover SVG Error:`, error),
    // onChunk: (chunk) => console.log(`[${report.id}] Cover SVG:`, JSON.stringify(chunk)),
    onFinish: async (result) => {
      console.log(`Report cover SVG generated for ${report.id}`);
      await prisma.analystReport.update({
        where: { id: report.id },
        data: { coverSvg: result.text },
      });
      if (result.usage.totalTokens > 0 && statReport) {
        await statReport("tokens", result.usage.totalTokens, {
          reportedBy: "generateReport tool",
          part: "coverSvg",
        });
      }
    },
    abortSignal,
  });
  await response.consumeStream();
}
