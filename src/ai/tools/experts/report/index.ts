import "server-only";

import { reportHTMLPrologue, reportHTMLSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { triggerImagegenInReport } from "@/app/(study)/artifacts/lib/imagegen";
import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
import { Analyst, AnalystKind, AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { FinishReason, ModelMessage, stepCountIs, streamText, tool } from "ai";
import { generateReportCoverSvg } from "./coverSvg";
import { generateAndSaveStudyLog } from "./studyLog";
import {
  generateReportInputSchema,
  generateReportOutputSchema,
  type GenerateReportResult,
} from "./types";

/**
 * Clean up markdown code blocks that AI models (especially Gemini) often add around HTML content
 */
function cleanHtmlFromMarkdown(html: string): string {
  return html
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export const generateReportTool = ({
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Generate a comprehensive study report synthesizing all interview data, user insights, and findings from the completed study.",
    inputSchema: generateReportInputSchema,
    outputSchema: generateReportOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({
      instruction,
      // regenerate,
      reportToken,
    }): Promise<GenerateReportResult> => {
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
      const reportLogger = logger.child({ analystId, reportToken });
      let report = await prisma.analystReport.findFirst({
        where: { analystId },
        orderBy: { createdAt: "desc" },
      });
      let lastReport: AnalystReport | undefined = report ?? undefined;
      let hint = "";
      // if (report?.generatedAt && !regenerate) {
      //   return {
      //     reportToken: report.token,
      //     plainText: `Report for study ${analystId} already exists. To regenerate, please set regenerate: true. You can provide additional instructions to specify report style or content requirements.`,
      //   };
      // }
      if (report && !report.generatedAt) {
        // 复用这个没完成的 report 记录，并覆盖 token，原来的 token 没用了，因为报告都没生成完
        hint = `Continuing from previous incomplete report (${report.token}).`;
        report = await prisma.analystReport.update({
          where: { id: report.id },
          data: { token: reportToken, instruction },
        });
        lastReport = undefined;
      } else {
        report = await prisma.analystReport.create({
          data: { analystId, instruction, token: reportToken, coverSvg: "", onePageHtml: "" },
        });
      }

      // Generate Report
      try {
        await generateReport({
          analyst,
          report,
          lastReport,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLogger,
        });
        // 更新一下 report 的数据
        report = await prisma.analystReport.findUniqueOrThrow({
          where: { id: report.id },
        });
      } catch (error) {
        reportLogger.error(`Error generating report for analyst ${analystId}: ${error}`);
        throw error;
        // return {
        //   plainText: `为研究主题 ${analystId} 生成报告失败：${(error as Error).message}`,
        // };
      }

      await Promise.all([
        generateReportScreenshot({
          ...report,
          extra: report.extra as AnalystReportExtra,
          analyst,
        }).catch((error) => {
          reportLogger.error(`Error generating screenshot for report ${report.token}: ${error}`); // screenshot 生成失败就算了
        }),
        generateReportCoverSvg({
          analyst,
          report,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLogger,
        }).catch((error) => {
          reportLogger.error(`Error generating cover for analyst ${analystId}: ${error}`); // cover 生成失败就算了
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
  lastReport,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
  systemPrompt,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  report: AnalystReport;
  lastReport?: AnalystReport;
  instruction: string;
  systemPrompt?: string;
} & AgentToolConfigArgs) {
  // 如果 studyLog 没有生成过，先生成，report 的内容主要来自 studyLog
  if (analyst.studyLog) {
    logger.info("generateReport: studyLog found in Analyst");
  } else {
    logger.info("studyLog not found in Analyst, generating studyLog");
    try {
      const { studyLog } = await generateAndSaveStudyLog({
        analyst,
        locale,
        abortSignal,
        statReport,
        logger,
      });
      // ⚠️ IMPROVE THIS，更新 analyst 对象上的 studyLog，不从数据库读取
      analyst = {
        ...analyst,
        studyLog,
      };
    } catch (error) {
      logger.error(`Error generating study process for analyst ${analyst.id}: ${error}`);
      throw error;
    }
  }

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
            data: { onePageHtml: cleanHtmlFromMarkdown(onePageHtml) },
          });
          await triggerImagegenInReport(onePageHtml, report.token);
          logger.info("HTML persisted successfully");
        } catch (error) {
          logger.error(`Error persisting HTML: ${(error as Error).message}`);
        }
      }
    };
  })();

  let modelName: LLMModelName = "claude-sonnet-4";
  while (true) {
    const streamTextPromise = new Promise<{
      finishReason: FinishReason | "Too many tokens";
      content: string;
    }>(async (resolve, reject) => {
      // study agent 已经使用了压缩信息的附件内容，
      // report 和 study agent 是同一个模型，如果不使用压缩的内容也会导致 token 太多而报错
      // 而且，现在其实报告生成不需要附件，可以暂时拿掉
      // const fileParts: FilePart[] = await Promise.all(
      //   ((analyst.attachments ?? []) as ChatMessageAttachment[]).map(
      //     async ({ name, objectUrl, mimeType }) => {
      //       const url = await fileUrlToDataUrl({ objectUrl, mimeType });
      //       return { type: "file", filename: name, data: url, mediaType: mimeType };
      //     },
      //   ),
      // );
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: reportHTMLPrologue({ locale, analyst, instruction, lastReport }),
            },
            // ...fileParts,
          ],
        },
      ];
      if (onePageHtml) {
        messages.push({
          role: "assistant",
          content: [{ type: "text", text: onePageHtml }],
        });
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Please continue with the remaining webpage content without repeating what's already been generated.",
            },
          ],
        });
      }
      const response = streamText({
        model: llm(modelName),
        providerOptions: defaultProviderOptions,

        system: systemPrompt
          ? systemPrompt
          : reportHTMLSystem({
              locale,
              analystKind: (analyst.kind as AnalystKind) || AnalystKind.misc,
            }),

        messages,
        stopWhen: stepCountIs(1),
        maxOutputTokens: 30000,

        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta") {
            onePageHtml += chunk.text.toString();
            await throttleSaveHTML(report.id, onePageHtml);
          }
        },

        onFinish: async ({ finishReason, text, usage }) => {
          resolve({
            finishReason: finishReason,
            content: text,
          });
          logger.info({ msg: "generateReport streamText onFinish", finishReason, usage });
          // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
          const totalTokens =
            (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
          if (totalTokens > 0 && statReport) {
            await statReport("tokens", totalTokens, {
              reportedBy: "generateReport tool",
              part: "onePageHtml",
              usage,
            });
          }
        },

        onError: ({ error }) => {
          const msg = (error as Error).message;
          if (msg.includes("Too many tokens")) {
            logger.warn(
              `HTML generation hit token limit, cooling down and switching model: ${msg}`,
            );
            // claude 有时候会遇到 quota 不够，这时候不报错，随机等待1~2min，换个模型继续
            setTimeout(
              () => resolve({ finishReason: "Too many tokens", content: "" }),
              Math.floor(Math.random() * (120_000 - 60_000 + 1)) + 60_000,
            );
          } else if ((error as Error).name === "AbortError") {
            logger.warn(`generateReport streamText aborted: ${(error as Error).message}`);
          } else {
            logger.error(`generateReport streamText onError: ${msg}`);
            reject(error);
          }
        },

        abortSignal,
      });
      abortSignal.addEventListener("abort", () => {
        reject(new Error("generateReport abortSignal received"));
      });
      response
        .consumeStream()
        .then(() => {})
        .catch((error) => reject(error));
    });

    const { finishReason } = await streamTextPromise;
    // finish 了以后，再保存一次
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
