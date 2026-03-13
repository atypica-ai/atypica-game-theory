import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import {
  interviewReportAppendSystemPrompt,
  interviewReportSystemPrompt,
} from "@/app/(interviewProject)/prompt";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { InterviewReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { stepCountIs, streamText, UserModelMessage } from "ai";
import { extractInterviewTranscript } from "../lib";

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

/**
 * Generate report content (background task)
 */
export async function generateInterviewReportContent({
  project,
  report,
}: {
  project: {
    id: number;
    userId: number;
    brief: string;
    sessions: {
      id: number;
      title: string;
      userChatId: number;
    }[];
  };
  report: {
    id: number;
    token: string;
  };
}): Promise<void> {
  const logger = rootLogger.child({ reportToken: report.token, projectId: project.id });

  const { statReport } = initInterviewProjectStatReporter({
    userId: project.userId, // ⚠️ 这里是 project owner 的 userId，不是正在被访谈的 userId
    interviewProjectId: project.id,
    logger,
  });

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
          await prisma.interviewReport.update({
            where: { id: reportId },
            data: { onePageHtml: cleanHtmlFromMarkdown(onePageHtml) },
          });
          logger.info("Interview report HTML persisted successfully");
        } catch (error) {
          logger.error(`Interview report HTML persisting error: ${(error as Error).message}`);
        }
      }
    };
  })();

  // interview report 优先使用 project brief 的语言
  const locale = await detectInputLanguage({
    text: project.brief,
  });

  // Prepare conversation data
  // const conversations = await Promise.all(
  //   project.sessions.map(async ({ title: sessionTitle, userChatId }) => {
  //     const transcript = await extractInterviewTranscript(userChatId);
  //     // Convert transcript messages to simple format for AI
  //     const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  //     for (const msg of transcript.messages) {
  //       if (msg.type === "message") {
  //         messages.push({
  //           role: msg.role,
  //           content: msg.textContent,
  //         });
  //       } else if (msg.type === "form") {
  //         // Convert form data to readable text
  //         const formText = msg.formData.fields
  //           .map((field) => `${field.label}: ${field.value}`)
  //           .join("\n");
  //         messages.push({
  //           role: "user",
  //           content: formText,
  //         });
  //       }
  //     }
  //     return { sessionTitle, messages };
  //   }),
  // );

  const BATCH_SIZE = 150;
  const totalSessions = project.sessions.length;
  let onePageHtml = ""; // 累积的 HTML，用于批次间传递

  for (let index = 0; index < totalSessions; index += BATCH_SIZE) {
    const isFirstBatch = index === 0;
    const isLastBatch = index + BATCH_SIZE >= totalSessions;
    const currentBatchNumber = Math.floor(index / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalSessions / BATCH_SIZE);

    // 每批只提取新增的 sessions
    const batchSessions = project.sessions.slice(
      index,
      Math.min(index + BATCH_SIZE, totalSessions),
    );

    logger.info({
      msg: "Processing batch for interview report",
      batchIndex: currentBatchNumber,
      totalBatches,
      batchSessionsCount: batchSessions.length,
      processedSessions: index + batchSessions.length,
      totalSessions,
    });

    // 提取当前批次的 summaries
    const summaries = (
      await Promise.all(
        batchSessions.map(async ({ title: sessionTitle, userChatId }) => {
          const { summary, personalInfo } = await extractInterviewTranscript(userChatId);
          const personalDesc = personalInfo
            ?.map(({ label, text }) => `${label}: ${text}`)
            .join("\n");
          return `---\n${sessionTitle}\n${personalDesc}\n${summary}\n`;
        }),
      )
    ).join("\n\n");

    // 构建多个 user messages
    const userMessages: UserModelMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              locale === "zh-CN"
                ? `【访谈项目简介】\n${project.brief}`
                : `【Interview Project Brief】\n${project.brief}`,
          },
        ],
      },
    ];

    // 如果不是第一批，添加已有的 HTML
    if (!isFirstBatch && onePageHtml) {
      userMessages.push({
        role: "user",
        content: [
          {
            type: "text",
            text:
              locale === "zh-CN"
                ? `【已有报告HTML】\n${onePageHtml}`
                : `【Existing Report HTML】\n${onePageHtml}`,
          },
        ],
      });
    }

    // 添加访谈总结（注明是新增的数据）
    userMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            locale === "zh-CN"
              ? isFirstBatch
                ? `【访谈对话总结】${summaries.length}人\n${summaries}`
                : `【新增访谈对话总结】${summaries.length}人（第 ${currentBatchNumber} 批，共 ${totalBatches} 批）\n${summaries}`
              : isFirstBatch
                ? `【Interview Summaries】${summaries.length} People\n${summaries}`
                : `【New Interview Summaries】${summaries.length} People (Batch ${currentBatchNumber} of ${totalBatches})\n${summaries}`,
        },
      ],
    });

    // 添加生成指令
    userMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            locale === "zh-CN"
              ? isFirstBatch
                ? "请基于以上信息，生成一篇完整的访谈分析长文。记住：这是一篇平铺的文章，不是结构化的多页文档。直接输出 HTML 代码，从 <!DOCTYPE html> 开始。"
                : "请基于已有报告和新增数据，重新生成一份完整的访谈分析报告。保持风格一致，自然融合新旧内容。直接输出 HTML 代码，从 <!DOCTYPE html> 开始。"
              : isFirstBatch
                ? "Based on the above information, generate a complete interview analysis article. Remember: this is a linear narrative, not a structured multi-page document. Output HTML code directly, starting with <!DOCTYPE html>."
                : "Based on the existing report and new data, regenerate a complete interview analysis report. Maintain consistent style and naturally integrate old and new content. Output HTML code directly, starting with <!DOCTYPE html>.",
        },
      ],
    });

    // 重置当前批次的 HTML
    let currentBatchHtml = "";

    const response = streamText({
      // model: llm("claude-sonnet-4"),
      // 当访谈有 100 左右时，claude 的 input token context 不够，需要用 gemini
      model: llm("gemini-3.1-pro"),
      // model: llm("gpt-5.2"),
      providerOptions: defaultProviderOptions(),
      system: isFirstBatch
        ? interviewReportSystemPrompt({ locale })
        : interviewReportAppendSystemPrompt({ locale }),

      messages: userMessages,

      stopWhen: stepCountIs(1),
      maxOutputTokens: 30000,

      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          currentBatchHtml += chunk.text.toString();
          await throttleSaveHTML(report.id, currentBatchHtml);
        }
      },

      onFinish: async ({ finishReason, usage }) => {
        logger.info({
          msg: "Interview report generation streamText onFinish",
          batchIndex: currentBatchNumber,
          finishReason,
          usage,
        });
        // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
        const totalTokens =
          (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
        if (totalTokens > 0 && statReport) {
          await statReport("tokens", totalTokens, {
            reportedBy: "interview report",
            part: `batch-${currentBatchNumber}`,
            usage,
          });
        }

        // 清理并更新累积的 HTML
        onePageHtml = cleanHtmlFromMarkdown(currentBatchHtml);

        // 生成结束以后，立即保存一次
        await throttleSaveHTML(report.id, onePageHtml, { immediate: true });

        // 只在最后一批才更新 generatedAt
        if (isLastBatch) {
          await prisma.interviewReport.update({
            where: { id: report.id },
            data: { generatedAt: new Date() },
          });
        }
      },

      onError: async ({ error }) => {
        logger.error(`Interview report generation streamText onError: ${(error as Error).message}`);
        await mergeExtra({
          tableName: "InterviewReport",
          id: report.id,
          extra: { error: (error as Error).message } satisfies InterviewReportExtra,
        });
      },
    });

    await response
      .consumeStream()
      .then(() => {})
      .catch(async (error) => {
        await mergeExtra({
          tableName: "InterviewReport",
          id: report.id,
          extra: { error: (error as Error).message } satisfies InterviewReportExtra,
        });
      });
  }
}
