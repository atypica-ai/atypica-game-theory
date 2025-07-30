import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { ChatMessage } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { streamText } from "ai";
import { getLocale } from "next-intl/server";
import { interviewReportPrologue, interviewReportSystemPrompt } from "../prompt";

/**
 * Generate report content (background task)
 */
export async function generateInterviewReportContent({
  project,
  report,
}: {
  project: {
    id: number;
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
            data: { onePageHtml },
          });
          logger.info("Interview report HTML persisted successfully");
        } catch (error) {
          logger.error(`Interview report HTML persisting error: ${(error as Error).message}`);
        }
      }
    };
  })();

  const locale = await getLocale();

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
    model: llm("claude-sonnet-4"),
    providerOptions: providerOptions,
    system: interviewReportSystemPrompt({ locale }),
    messages: [
      {
        role: "user",
        content: interviewReportPrologue({
          locale,
          projectBrief: project.brief,
          conversations,
        }),
      },
    ],
    maxSteps: 1,
    maxTokens: 30000,
    onChunk: async ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onePageHtml += chunk.textDelta.toString();
        await throttleSaveHTML(report.id, onePageHtml);
      }
    },
    onFinish: async () => {
      // consume toikens
    },
    onError: ({ error }) => {
      rootLogger.error(`Interview report generation error: ${(error as Error).message}`);
    },
  });

  await response.consumeStream();

  await throttleSaveHTML(report.id, onePageHtml, { immediate: true });
  await prisma.analystReport.update({
    where: { id: report.id },
    data: { generatedAt: new Date() },
  });
}
