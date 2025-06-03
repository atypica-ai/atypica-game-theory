import "server-only";

import {
  reportCoverPrologue,
  reportCoverSystem,
  reportHTMLPrologue,
  reportHTMLSystem,
} from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { PlainTextToolResult, StatReporter } from "@/ai/tools/types";
import { triggerImagegenInReport } from "@/app/artifacts/lib/imagegen";
import { generateReportScreenshot } from "@/app/artifacts/lib/screenshot";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { ChatMessageAttachment } from "@/lib/attachments/types";
import { generateToken } from "@/lib/utils";
import { Analyst, AnalystReport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { FinishReason, Message, streamText, tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";
import { type GenerateReportResult } from "./types";

export const generateReportTool = ({
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  studyLog,
}: {
  studyUserChatId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description:
      "Generate a comprehensive study report synthesizing all interview data, user insights, and findings from the completed study",
    parameters: z.object({
      instruction: z
        .string()
        .describe("Additional formatting, style, or content focus requirements for the report")
        .default(""),
      regenerate: z
        .boolean()
        .describe("Whether to regenerate an existing report with new analysis")
        .default(false),
      reportToken: z
        .string()
        .optional()
        .describe(
          "Report token used to create records. You don't need to provide this - the system will automatically generate it",
        )
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
          plainText: `Report for study ${analystId} already exists. To regenerate, please set regenerate: true. You can provide additional instructions to specify report style or content requirements.`,
        };
      }
      if (report && !report.generatedAt) {
        // 复用这个没完成的 report 记录，并覆盖 token
        hint = `Continuing from previous incomplete report (${report.token}).`;
        report = await prisma.analystReport.update({
          where: { id: report.id },
          data: { token: reportToken, instruction },
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
          locale,
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

      await Promise.all([
        generateReportScreenshot({
          ...report,
          extra: report.extra as { coverObjectUrl?: string } | null,
          analyst,
        }).catch((error) => {
          reportLog.error(`Error generating screenshot for report ${report.token}: ${error}`); // cover 生成失败就算了
        }),
        generateCover({
          analyst,
          report,
          instruction,
          locale,
          abortSignal,
          statReport,
          reportLog,
        }).catch((error) => {
          reportLog.error(`Error generating cover for analyst ${analystId}: ${error}`); // cover 生成失败就算了
        }),
      ]);

      return {
        reportToken: report.token,
        plainText: `Report successfully generated. ${hint}`,
      };
    },
  });

export async function generateReport({
  analyst,
  report,
  instruction,
  locale,
  abortSignal,
  statReport,
  reportLog,
  systemPrompt,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  report: AnalystReport;
  instruction: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  reportLog: Logger;
  systemPrompt?: string;
}) {
  let onePageHtml = report.onePageHtml; // 如果 report 有内容，就继续使用 report 的 onePageHtml

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
          const report = await prisma.analystReport.update({
            where: { id: reportId },
            data: { onePageHtml },
          });
          await triggerImagegenInReport(onePageHtml, report.token);
          reportLog.info("HTML persisted successfully");
        } catch (error) {
          reportLog.error(`Error persisting HTML: ${(error as Error).message}`);
        }
      }
    };
  })();

  let modelName: LLMModelName = "claude-sonnet-4";
  while (true) {
    const {
      finishReason,
      // content,
    } = await new Promise<{
      finishReason: FinishReason | "Too many tokens";
      content: string;
    }>(async (resolve, reject) => {
      const experimental_attachments = analyst.attachments
        ? await Promise.all(
            (analyst.attachments as ChatMessageAttachment[]).map(
              async ({ name, objectUrl, mimeType }) => {
                const url = await fileUrlToDataUrl({ objectUrl, mimeType });
                return { name, url, contentType: mimeType };
              },
            ),
          )
        : undefined;
      const messages: Omit<Message, "id">[] = [
        {
          role: "user",
          content: reportHTMLPrologue({ locale, analyst, instruction }),
          experimental_attachments,
        },
      ];
      if (onePageHtml) {
        messages.push({ role: "assistant", content: onePageHtml });
        messages.push({
          role: "user",
          content:
            "Please continue with the remaining webpage content without repeating what's already been generated.",
        });
      }
      const response = streamText({
        model: llm(modelName),
        providerOptions: providerOptions,
        system: systemPrompt ? systemPrompt : reportHTMLSystem({ locale }),
        messages: messages,
        maxSteps: 1,
        maxTokens: 30000,
        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta") {
            onePageHtml += chunk.textDelta.toString();
            await throttleSaveHTML(report.id, onePageHtml);
          }
        },
        onFinish: async ({ finishReason, text, usage }) => {
          resolve({
            finishReason: finishReason,
            content: text,
          });
          reportLog.info({ msg: "HTML generated", finishReason, usage });
          if (usage.totalTokens > 0 && statReport) {
            await statReport("tokens", usage.totalTokens, {
              reportedBy: "generateReport tool",
              part: "onePageHtml",
              usage,
            });
          }
        },
        onError: ({ error }) => {
          const msg = (error as Error).message;
          if (msg.includes("Too many tokens")) {
            reportLog.warn(
              `HTML generation hit token limit, cooling down and switching model: ${msg}`,
            );
            // claude 有时候会遇到 quota 不够，这时候不报错，随机等待1~2min，换个模型继续
            setTimeout(
              () => resolve({ finishReason: "Too many tokens", content: "" }),
              Math.floor(Math.random() * (120_000 - 60_000 + 1)) + 60_000,
            );
          } else {
            reportLog.error(`HTML generation Error: ${msg}`);
            reject(error);
          }
        },
        abortSignal,
      });

      response.consumeStream().catch((error) => reject(error));
    });

    await throttleSaveHTML(report.id, onePageHtml, { immediate: true });

    if (finishReason === "length") {
      continue;
    } else if (finishReason === "Too many tokens") {
      modelName = "claude-3-7-sonnet";
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

export async function generateCover({
  analyst,
  report,
  instruction,
  locale,
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
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  reportLog: Logger;
}) {
  const response = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: reportCoverSystem({ locale }),
    messages: [{ role: "user", content: reportCoverPrologue({ locale, analyst, instruction }) }],
    maxSteps: 1,
    maxTokens: 10000,
    onError: ({ error }) => reportLog.error(`Cover SVG error: ${(error as Error).message}`),
    onFinish: async ({ text, usage }) => {
      reportLog.info("Report cover SVG generated");
      await prisma.analystReport.update({
        where: { id: report.id },
        data: { coverSvg: text },
      });
      if (usage.totalTokens > 0 && statReport) {
        await statReport("tokens", usage.totalTokens, {
          reportedBy: "generateReport tool",
          part: "coverSvg",
          usage,
        });
      }
    },
    abortSignal,
  });
  await response.consumeStream();
}
