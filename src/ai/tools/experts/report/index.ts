import "server-only";

import {
  reportCoverPrologue,
  reportCoverSystem,
  reportHTMLPrologue,
  reportHTMLSystem,
} from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { triggerImagegenInReport } from "@/app/(study)/artifacts/lib/imagegen";
import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { fixMalformedUnicodeString, generateToken } from "@/lib/utils";
import { Analyst, AnalystReport, AnalystReportExtra, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { FinishReason, Message, streamText, tool } from "ai";
import { z } from "zod";
import { type GenerateReportResult } from "./types";

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
    parameters: z.object({
      instruction: z
        .string()
        .describe(
          "REQUIRED: Detailed report style descriptions. Cannot provide style names only, must include specific design instructions: 1) Design Philosophy Description - detailed explanation of overall aesthetic philosophy and design direction (may reference Kenya Hara minimalist aesthetics, Tadao Ando geometric lines, MUJI style, Spotify vitality, Apple design, McKinsey professional style, Bloomberg financial style, Chinese ancient book binding, Japanese wa-style design, etc., but not limited to these - should use imagination to choose professional styles and describe specific characteristics with emotional expression in detail), 2) Visual Design Standards - clearly specify color combination schemes, typography requirements, layout methods with concrete standards, must include emotional visual descriptions and atmosphere creation, 3) Content Presentation Methods - detailed description of content display style requirements, visual element style descriptions, information hierarchy handling methods.",
        )
        .transform(fixMalformedUnicodeString),
      // 这个不要了，只要发起 generateReport 就都是生成一个新的
      // regenerate: z
      //   .boolean()
      //   .describe("Whether to regenerate an existing report with new analysis")
      //   .default(false),
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
      const reportLog = logger.child({ analystId, reportToken });
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
      try {
        await generateReport({
          analyst,
          report,
          lastReport,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLog,
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
          extra: report.extra as AnalystReportExtra,
          analyst,
        }).catch((error) => {
          reportLog.error(`Error generating screenshot for report ${report.token}: ${error}`); // screenshot 生成失败就算了
        }),
        generateCover({
          analyst,
          report,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLog,
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
          content: reportHTMLPrologue({
            locale,
            analyst,
            instruction,
            lastReport,
          }),
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
        system: systemPrompt
          ? systemPrompt
          : reportHTMLSystem({
              locale,
              analystKind: (analyst.kind as AnalystKind) || AnalystKind.misc,
            }),
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
          logger.info({ msg: "generateReport streamText onFinish", finishReason, usage });
          // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
          const totalTokens =
            (usage.completionTokens ?? 0) * 3 + (usage.promptTokens ?? 0) || usage.totalTokens;
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

export async function generateCover({
  analyst,
  report,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  report: AnalystReport;
  instruction: string;
} & AgentToolConfigArgs) {
  const response = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: reportCoverSystem({ locale }),
    messages: [{ role: "user", content: reportCoverPrologue({ locale, analyst, instruction }) }],
    maxSteps: 1,
    maxTokens: 10000,
    onFinish: async ({ text, usage }) => {
      logger.info("Report cover SVG generated");
      await prisma.analystReport.update({
        where: { id: report.id },
        data: { coverSvg: text },
      });
      // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
      const totalTokens =
        (usage.completionTokens ?? 0) * 3 + (usage.promptTokens ?? 0) || usage.totalTokens;
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
