import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { ChatMessage } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { stepCountIs, streamText } from "ai";
import { interviewReportPrologue, interviewReportSystemPrompt } from "../prompt";

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
      title: string;
      userChat: {
        messages: Pick<ChatMessage, "role" | "content">[];
      };
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
  const conversations = project.sessions.map(({ title: sessionTitle, userChat }) => {
    const messages = userChat.messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
    return { sessionTitle, messages };
  });

  let onePageHtml = "";
  const response = streamText({
    // model: llm("claude-sonnet-4"),
    // 当访谈有 100 左右时，claude 的 input token context 不够，需要用 gemini
    model: llm("gemini-2.5-pro"),
    providerOptions: defaultProviderOptions,
    system: interviewReportSystemPrompt({ locale }),

    messages: [
      {
        role: "user",

        parts: [
          {
            type: "text",

            text: interviewReportPrologue({
              locale,
              projectBrief: project.brief,
              conversations,
            }),
          },
        ],
      },
    ],

    stopWhen: stepCountIs(1),
    maxOutputTokens: 30000,

    onChunk: async ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onePageHtml += chunk.textDelta.toString();
        await throttleSaveHTML(report.id, onePageHtml);
      }
    },

    onFinish: async ({ finishReason, usage }) => {
      logger.info({ msg: "Interview report generation streamText onFinish", finishReason, usage });
      // svg 生成耗费的 output tokens 比较多，不能和 input tokens 一样计算
      const totalTokens =
        (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
      if (totalTokens > 0 && statReport) {
        await statReport("tokens", totalTokens, {
          reportedBy: "interview report",
          part: "onePageHtml",
          usage,
        });
      }
    },

    onError: ({ error }) => {
      logger.error(`Interview report generation streamText onError: ${(error as Error).message}`);
    },
  });

  await response.consumeStream();

  await throttleSaveHTML(report.id, cleanHtmlFromMarkdown(onePageHtml), { immediate: true });
  await prisma.interviewReport.update({
    where: { id: report.id },
    data: { generatedAt: new Date() },
  });
}
