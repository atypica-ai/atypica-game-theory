import type { AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getWorkspacePath } from "@/lib/skill/utils";
import fs from "fs/promises";
import path from "path";
import type { Logger } from "pino";
import {
  buildReportWorkspaceMeta,
  buildReportWorkspaceRelativeDir,
  buildReportWorkspaceSummary,
} from "./reportWorkspaceShared";

export async function persistReportToWorkspace({
  userId,
  studyUserChatId,
  reportToken,
  logger,
}: {
  userId: number;
  studyUserChatId: number;
  reportToken: string;
  logger: Logger;
}): Promise<void> {
  const [studyUserChat, report] = await Promise.all([
    prisma.userChat.findUnique({
      where: { id: studyUserChatId },
      select: { token: true },
    }),
    prisma.analystReport.findUnique({
      where: { token: reportToken },
      select: {
        token: true,
        userId: true,
        instruction: true,
        onePageHtml: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
        extra: true,
      },
    }),
  ]);

  if (!studyUserChat || !report || report.userId !== userId) {
    logger.warn({
      msg: "[ReportWorkspace] Skip workspace write due to missing or unauthorized report/chat",
      userId,
      studyUserChatId,
      reportToken,
      hasStudyUserChat: !!studyUserChat,
      hasReport: !!report,
    });
    return;
  }

  const workspaceRoot = getWorkspacePath(userId);
  const relativeDir = buildReportWorkspaceRelativeDir(studyUserChat.token, reportToken);
  const reportDir = path.join(workspaceRoot, relativeDir);
  const reportsDir = path.dirname(reportDir);

  await fs.mkdir(reportDir, { recursive: true });

  const meta = buildReportWorkspaceMeta({
    reportToken,
    studyUserChatId,
    studyUserChatToken: studyUserChat.token,
    instruction: report.instruction,
    extra: (report.extra || {}) as AnalystReportExtra,
    generatedAt: report.generatedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  });

  await Promise.all([
    fs.writeFile(path.join(reportDir, "report.html"), report.onePageHtml || "", "utf-8"),
    fs.writeFile(path.join(reportDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf-8"),
    fs.writeFile(path.join(reportDir, "summary.md"), buildReportWorkspaceSummary(meta), "utf-8"),
    fs.writeFile(
      path.join(reportsDir, "latest.json"),
      `${JSON.stringify(
        {
          version: 1,
          reportToken,
          workspaceReportDir: relativeDir,
          updatedAt: meta.writtenAt,
        },
        null,
        2,
      )}\n`,
      "utf-8",
    ),
  ]);

  logger.info({
    msg: "[ReportWorkspace] Persisted report to workspace",
    userId,
    studyUserChatId,
    reportToken,
    relativeDir,
  });
}
