import { llm, providerOptions } from "@/ai/llm";
import {
  reportCoverPrologue,
  reportCoverSystem,
  reportHTMLPrologue,
  reportHTMLSystem,
} from "@/ai/prompt";
import { PlainTextToolResult, StatReporter } from "@/ai/tools";
import { generateToken } from "@/lib/utils";
import { Analyst, AnalystReport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { FinishReason, Message, streamText, tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";

export interface GenerateReportResult extends PlainTextToolResult {
  reportToken?: string;
  plainText: string;
}

export const generateReportTool = ({
  studyUserChatId,
  abortSignal,
  statReport,
  studyLog,
}: {
  studyUserChatId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description: "为本次研究生成报告",
    parameters: z.object({
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
    execute: async ({ instruction, regenerate, reportToken }): Promise<GenerateReportResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            include: {
              interviews: {
                where: { conclusion: { not: "" } },
              },
            },
          },
        },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      // if (await prisma.analystReport.findUnique({ where: { token: reportToken } })) {
      //   return {
      //     plainText: `为调研主题 ${analystId} 生成报告失败：你提供的 reportToken ${reportToken} 已经存在，无法使用，请重试。你可以忽略提供这个字段，系统会自动生成 token。`,
      //   };
      // }
      const reportLog = studyLog.child({ analystId, reportToken });
      let report = await prisma.analystReport.findFirst({
        where: { analystId },
        orderBy: { createdAt: "desc" },
      });
      let hint = "";
      if (report?.generatedAt && !regenerate) {
        return {
          reportToken: report.token,
          plainText: `研究 ${analystId} 的报告已经存在，如需重新生成请设置 regenerate: true。您可以提供额外的指令来指定报告风格或内容要求。`,
        };
      }
      if (report && !report.generatedAt) {
        // 复用这个没完成的 report 记录，并覆盖 token
        hint = `从上次未完成的报告记录（${report.token}）继续生成。`;
        report = await prisma.analystReport.update({
          where: { id: report.id },
          data: { token: reportToken, instruction, onePageHtml: "", coverSvg: "" },
        });
      } else {
        report = await prisma.analystReport.create({
          data: { analystId, instruction, token: reportToken, coverSvg: "", onePageHtml: "" },
        });
      }
      try {
        await generateReport({
          analyst,
          report,
          instruction,
          abortSignal,
          statReport,
          reportLog,
        });
        // 更新一下 report 的数据
        report = await prisma.analystReport.findUniqueOrThrow({
          where: { id: report.id },
        });
      } catch (error) {
        reportLog.error(`Error generating report for analyst ${analystId}: ${error}`);
        throw error;
        // return {
        //   plainText: `为研究主题 ${analystId} 生成报告失败：${(error as Error).message}`,
        // };
      }
      try {
        await generateCover({
          analyst,
          report,
          instruction,
          abortSignal,
          statReport,
          reportLog,
        });
      } catch (error) {
        // cover 生成失败就算了
        reportLog.error(`Error generating cover for analyst ${analystId}: ${error}`);
      }
      return {
        reportToken: report.token,
        plainText: `已成功为研究主题 ${analystId} 生成报告。${hint}`,
      };
    },
  });

async function generateReport({
  analyst,
  report,
  instruction,
  abortSignal,
  statReport,
  reportLog,
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
  reportLog: Logger;
}) {
  let onePageHtml = "";
  let messages: Omit<Message, "id">[] = [
    { role: "user", content: reportHTMLPrologue(analyst, instruction) },
  ];

  const throttleSaveHTML = (() => {
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
          reportLog.info("HTML persisted successfully");
        } catch (error) {
          reportLog.error(`Error persisting HTML: ${(error as Error).message}`);
        }
      }
    };
  })();

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
        maxTokens: 30000,
        onChunk: async ({ chunk }) => {
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
          reportLog.info({
            msg: "HTML generated",
            finishReason: result.finishReason,
            usage: result.usage,
          });
          if (result.usage.totalTokens > 0 && statReport) {
            await statReport("tokens", result.usage.totalTokens, {
              reportedBy: "generateReport tool",
              part: "onePageHtml",
            });
          }
        },
        onError: ({ error }) => {
          reportLog.error(`HTML generation Error: ${(error as Error).message}`);
          reject(error);
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
  reportLog,
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
  reportLog: Logger;
}) {
  const response = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: reportCoverSystem(),
    messages: [{ role: "user", content: reportCoverPrologue(analyst, instruction) }],
    maxSteps: 1,
    maxTokens: 10000,
    onError: ({ error }) => reportLog.error(`Cover SVG error: ${(error as Error).message}`),
    onFinish: async (result) => {
      reportLog.info("Report cover SVG generated");
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
