import "server-only";

import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { triggerImagegenInReport } from "@/app/(study)/artifacts/lib/imagegen";
import { reportHTMLPrologue, reportHTMLSystem } from "./prompt";
// import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
import { generateAndSaveStudyLog } from "@/app/(study)/agents/studyLog";
import { UserChatContext } from "@/app/(study)/context/types";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { FinishReason, ModelMessage, stepCountIs, streamText, tool } from "ai";
import { promises as fs } from "fs";
import { getReportCacheDir, getReportCacheFilePath } from "../../artifacts/lib/reportCache";
import { generateReportCoverImage } from "./coverImage";
import {
  generateReportInputSchema,
  generateReportOutputSchema,
  type GenerateReportResult,
} from "./types";

/**
 * Clean up markdown code blocks that AI models (especially Gemini) often add around HTML content
 */
function cleanHtmlFromMarkdown(html: string): string {
  const cleaned = html
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Extract content between <!DOCTYPE html> and </html>
  const match = cleaned.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i);
  return match ? match[0] : cleaned;
}

export const generateReportTool = ({
  userId,
  userChatId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
  userChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Generate a comprehensive study report synthesizing all interview data, user insights, and findings from the completed study.",
    inputSchema: generateReportInputSchema,
    outputSchema: generateReportOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async (
      { instruction, /*regenerate,*/ reportToken },
      { messages },
    ): Promise<GenerateReportResult> => {
      const userChat = await prisma.userChat.findUniqueOrThrow({
        where: {
          id: userChatId,
          // kind: "study", // 因为有 universal agent, 现在不过滤了
        },
        select: {
          title: true,
          token: true,
          analyst: {
            select: { studyLog: true, topic: true, kind: true },
          },
          context: true,
        },
      });

      /**
       * @todo 需要从 messages 里面获取 kind
       */
      const analystKind = userChat.analyst?.kind ?? undefined;

      let studyLog = userChat.analyst?.studyLog ?? "";

      // if (await prisma.analystReport.findUnique({ where: { token: reportToken } })) {
      //   return {
      //     plainText: `为调研主题 ${analystId} 生成报告失败：你提供的 reportToken ${reportToken} 已经存在，无法使用，请重试。你可以忽略提供这个字段，系统会自动生成 token。`,
      //   };
      // }
      const reportLogger = logger.child({ reportToken });
      let report: AnalystReport;
      let lastReport: AnalystReport | undefined =
        (await prisma.analystReport.findFirst({
          where: {
            userId, // 过滤一下当前用户的
            token: {
              in: (userChat.context as UserChatContext).reportTokens ?? [],
            },
          },
          orderBy: { createdAt: "desc" },
        })) ?? undefined;
      let hint = "";
      // if (report?.generatedAt && !regenerate) {
      //   return {
      //     reportToken: report.token,
      //     plainText: `Report for study ${analystId} already exists. To regenerate, please set regenerate: true. You can provide additional instructions to specify report style or content requirements.`,
      //   };
      // }
      if (lastReport && !lastReport.generatedAt) {
        // 复用这个没完成的 report 记录，并覆盖 token，原来的 token 没用了，因为报告都没生成完, extra 也完全覆盖
        hint = `Continuing from previous incomplete report (${lastReport.token}).`;
        report = await prisma.analystReport.update({
          where: { id: lastReport.id },
          data: {
            userId,
            token: reportToken,
            instruction,
            extra: {
              title: userChat.title,
              description: userChat?.analyst?.topic ?? "",
              userChatToken: userChat.token,
              analystKind,
            } satisfies AnalystReportExtra,
          },
        });
        lastReport = undefined;
      } else {
        report = await prisma.analystReport.create({
          data: {
            userId,
            instruction,
            token: reportToken,
            coverSvg: "",
            onePageHtml: "",
            extra: {
              title: userChat.title,
              description: userChat?.analyst?.topic ?? "",
              userChatToken: userChat.token,
              analystKind,
            } satisfies AnalystReportExtra,
          },
        });
      }

      // Save report token to context
      const context = (userChat.context || {}) as UserChatContext;
      const existingTokens = context.reportTokens || [];
      await mergeUserChatContext({
        id: userChatId,
        context: {
          reportTokens: Array.from(new Set([...existingTokens, report.token])),
        },
      });

      // 如果 studyLog 没有生成过，先生成，report 的内容主要来自 studyLog
      if (studyLog) {
        logger.info("generateReport: studyLog found in Analyst");
      } else {
        logger.info("studyLog not found in Analyst, generating studyLog");
        try {
          const result = await generateAndSaveStudyLog({
            userId,
            userChatId,
            messages,
            locale,
            abortSignal,
            statReport,
            logger,
          });
          studyLog = result.studyLog;
        } catch (error) {
          logger.error(`Error generating studyLog: ${error}`);
          throw error;
        }
      }

      await Promise.all([
        generateReport({
          analystKind,
          studyLog,
          userId,
          report,
          lastReport,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLogger,
        })
          .then(async () => {
            // 更新一下 report 的数据
            report = await prisma.analystReport.findUniqueOrThrow({ where: { id: report.id } });
          })
          .catch((error) => {
            reportLogger.error(`Error generating report for userChat ${userChatId}: ${error}`);
            throw error;
          }),
        generateReportCoverImage({
          ratio: "landscape",
          studyLog,
          report,
          locale,
          abortSignal: AbortSignal.any([abortSignal, AbortSignal.timeout(180 * 1000)]), // 3 minutes timeout
          statReport,
          logger: reportLogger,
        }).catch(async (error) => {
          reportLogger.error({
            msg: `Error generating cover image for report ${report.token}, fallback to screenshot`,
            error: error.message,
          });
          // 因为现在 report 和 coverImage 是一起生成的，到这里不一定 report 已经生成好了，所以就不要 Fallback to screenshot 了
          // return await generateReportScreenshot({
          //   ...report,
          //   extra: report.extra as AnalystReportExtra,
          //   analyst,
          // }).catch((error) => {
          //   reportLogger.error(`Error generating screenshot for report ${report.token}: ${error}`); // screenshot 生成失败就算了
          // });
        }),
        // Deprecated: coverSvg generation is no longer used, replaced by coverImage
        // generateReportCoverSvg({
        //   analyst,
        //   report,
        //   instruction,
        //   locale,
        //   abortSignal,
        //   statReport,
        //   logger: reportLogger,
        // }).catch((error) => {
        //   reportLogger.error(`Error generating cover for analyst ${analystId}: ${error}`); // cover 生成失败就算了
        // }),
      ]);

      return {
        reportToken: report.token,
        plainText: `Report successfully generated. ${hint}`,
      };
    },
  });

async function generateReport({
  analystKind,
  studyLog,
  userId,
  report,
  lastReport,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
  systemPrompt,
}: {
  analystKind?: string;
  studyLog: string;
  userId: number;
  report: AnalystReport;
  lastReport?: AnalystReport;
  instruction: string;
  systemPrompt?: string;
} & AgentToolConfigArgs) {
  let onePageHtml = report.onePageHtml; // 如果 report 有内容，就继续使用 report 的 onePageHtml

  const throttleSaveToFile = (() => {
    let timerId: NodeJS.Timeout | null = null;
    const cacheDir = getReportCacheDir(userId, report.token);
    const htmlFilePath = getReportCacheFilePath(userId, report.token);

    return async (html: string, { immediate }: { immediate?: boolean } = {}) => {
      if (immediate) {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        await saveNow();
        return;
      }

      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = null;
          saveNow();
        }, 5000); // 5 second throttle
      }

      async function saveNow() {
        try {
          await fs.mkdir(cacheDir, { recursive: true });
          await fs.writeFile(htmlFilePath, html, "utf-8");
          logger.info("HTML persisted to local cache successfully");
        } catch (error) {
          logger.error({
            msg: "Error persisting HTML to cache",
            error: (error as Error).message,
          });
        }
      }
    };
  })();

  // let modelName: LLMModelName = "claude-sonnet-4-5";
  let modelName: LLMModelName = "gemini-3-pro";
  while (true) {
    const streamTextPromise = new Promise<{
      finishReason: FinishReason | "Too many tokens";
      content: string;
    }>(async (resolve, reject) => {
      // study agent 已经使用了压缩信息的附件内容，
      // report 和 study agent 是同一个模型，如果不使用压缩的内容也会导致 token 太多而报错
      // 而且，现在其实报告生成不需要附件，可以暂时拿掉
      // ⚠️ 如果这里要恢复，filename 得换一个，claude 模型对 name 有要求，只能是英文字母和数字
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
              text: reportHTMLPrologue({ locale, studyLog, instruction, lastReport }),
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
        providerOptions: {
          // bedrock: {
          //   reasoningConfig: {
          //     type: "disabled",
          //   },
          // } as BedrockProviderOptions,
        },

        system: systemPrompt
          ? systemPrompt
          : reportHTMLSystem({
              locale,
              analystKind,
            }),

        messages,
        stopWhen: stepCountIs(1),
        maxOutputTokens: 30000,

        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta") {
            onePageHtml += chunk.text.toString();
            await throttleSaveToFile(onePageHtml);
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
    // Save final version to file
    await throttleSaveToFile(onePageHtml, { immediate: true });

    if (finishReason === "length") {
      continue;
    } else if (finishReason === "Too many tokens") {
      modelName = "claude-3-7-sonnet";
      continue;
    } else {
      try {
        // Read from cache file
        const cleanedHtml = cleanHtmlFromMarkdown(onePageHtml);
        // Single database save
        await prisma.analystReport.update({
          where: { id: report.id },
          data: {
            onePageHtml: cleanedHtml,
            generatedAt: new Date(),
          },
        });
        // Trigger image generation once with final HTML
        await triggerImagegenInReport(cleanedHtml, report.token);
        logger.info("Report saved to database successfully");
      } catch (error) {
        logger.error({
          msg: "Error saving report to database",
          error: (error as Error).message,
        });
        throw error;
      } finally {
        // Cleanup temp file after generation complete
        try {
          const cacheDir = getReportCacheDir(userId, report.token);
          const htmlFilePath = getReportCacheFilePath(userId, report.token);
          await fs.unlink(htmlFilePath);
          await fs.rmdir(cacheDir);
          logger.info("Cleaned up cache directory");
        } catch (error) {
          logger.warn({
            msg: "Failed to cleanup cache directory",
            error: (error as Error).message,
          });
        }
      }
      break;
    }
  }
}
