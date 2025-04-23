import { llm, providerOptions } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import {
  reportCoverPrologue,
  reportCoverSystem,
  reportHTMLPrologue,
  reportHTMLSystem,
} from "@/prompt";
import { StatReporter } from "@/tools";
import { PlainTextToolResult } from "@/tools/utils";
import { Analyst, AnalystReport } from "@prisma/client";
import { FinishReason, Message, streamText, tool } from "ai";
import { z } from "zod";

export interface GenerateReportResult extends PlainTextToolResult {
  reportToken?: string;
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
      reportToken: z
        .string()
        .optional()
        .describe("报告的 token，用于创建记录，你不需要提供，系统会自动生成")
        // .default(() => generateToken())
        // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
        .transform(() => generateToken()),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({
      analystId,
      instruction,
      regenerate,
      reportToken,
    }): Promise<GenerateReportResult> => {
      // if (await prisma.analystReport.findUnique({ where: { token: reportToken } })) {
      //   return {
      //     plainText: `为调研主题 ${analystId} 生成报告失败：你提供的 reportToken ${reportToken} 已经存在，无法使用，请重试。你可以忽略提供这个字段，系统会自动生成 token。`,
      //   };
      // }
      let report = await prisma.analystReport.findFirst({
        where: { analystId },
        orderBy: { createdAt: "desc" },
      });
      let hint = "";
      if (report?.generatedAt && !regenerate) {
        return {
          reportToken: report.token,
          plainText: `调研主题 ${analystId} 的报告已经存在，如需重新生成请设置 regenerate: true。您可以提供额外的指令来指定报告风格或内容要求。`,
        };
      }
      if (report && !report.generatedAt) {
        // 复用这个没完成的 report 记录，并覆盖 token
        hint = `从上次未完成的报告记录（${report.token}）继续生成。`;
        report = await prisma.analystReport.update({
          where: { id: report.id },
          data: { onePageHtml: "", token: reportToken, coverSvg: "" },
        });
      } else {
        report = await prisma.analystReport.create({
          data: { analystId, token: reportToken, coverSvg: "", onePageHtml: "" },
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
          reportToken: report.token,
          plainText: `已成功为调研主题 ${analystId} 生成报告。${hint}`,
        };
      } catch (error) {
        console.log(error);
        return {
          plainText: `为调研主题 ${analystId} 生成报告失败：${(error as Error).message}`,
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
  let messages: Omit<Message, "id">[] = [
    { role: "user", content: reportHTMLPrologue(analyst, instruction) },
  ];

  while (true) {
    const {
      finishReason,
      // content,
    } = await new Promise<{
      finishReason: FinishReason;
      content: string;
    }>((resolve, reject) => {
      const response = streamText({
        model: llm("claude-3-7-sonnet"),
        providerOptions: providerOptions,
        system: reportHTMLSystem(),
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
          console.log(
            `Report [${report.id}] HTML generated, finishReason: ${result.finishReason}`,
            result.usage,
          );
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
        { role: "user", content: reportHTMLPrologue(analyst, instruction) },
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
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: reportCoverSystem(),
    messages: [{ role: "user", content: reportCoverPrologue(analyst, instruction) }],
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
