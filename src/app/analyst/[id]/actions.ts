"use server";
import { prepareDBForInterview, runInterview } from "@/ai/tools/experts/interviewChat";

import { generateReport } from "@/ai/tools/experts/generateReport";
import { generateReportCoverSvg } from "@/ai/tools/experts/generateReport/coverSvg";
import { StatReporter } from "@/ai/tools/types";
import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { Analyst, AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { forbidden } from "next/navigation";
import { Logger } from "pino";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backgroundWait(promise: Promise<any>, logger: Logger) {
  waitUntil(
    new Promise(async (resolve, reject) => {
      let stop = false;
      const start = Date.now();
      const tick = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        if (elapsedSeconds > 1200) {
          // 20 mins
          logger.warn("timeout");
          stop = true;
          reject(new Error("interview timeout"));
        }
        if (stop) {
          logger.info("stopped");
        } else {
          logger.info(`ongoing, ${elapsedSeconds} seconds`);
          setTimeout(() => tick(), 5000);
        }
      };
      tick();

      promise
        .then(() => {
          stop = true;
          resolve(null);
        })
        .catch((error) => {
          stop = true;
          reject(error);
        });
    }),
  );
}

export async function batchBackgroundInterview({
  analystId,
  personaIds,
}: {
  analystId: number;
  personaIds: number[];
}): Promise<void> {
  return withAuth(async (user) => {
    // 确保 analyst 属于当前用户
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });
    if (analyst?.userId !== user.id) {
      forbidden();
    }

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const locale =
      analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
        ? (analyst.locale as Locale)
        : await detectInputLanguage({ text: analyst.brief });

    for (const personaId of personaIds) {
      const { analystInterviewId, interviewUserChatId, prompt, attachments } =
        await prepareDBForInterview({
          userId: user.id,
          personaId,
          analystId,
          instruction: "",
          locale,
        });

      const interviewLog = rootLogger.child({
        interviewUserChatId,
        analystInterviewId,
        method: "batchBackgroundInterview",
      });
      const statReport: StatReporter = async (dimension, value, extra) => {
        interviewLog.info(`statReport: ${dimension}=${value} ${JSON.stringify(extra)}`);
      };

      backgroundWait(
        runInterview({
          analystInterviewId,
          interviewUserChatId,
          prompt,
          attachments,
          locale,
          abortSignal,
          statReport,
          logger: interviewLog,
        }),
        interviewLog,
      );
    }
  });
}

export async function fetchAnalystReports({ analystId }: { analystId: number }): Promise<
  ServerActionResult<
    (Pick<
      AnalystReport,
      "id" | "token" | "analystId" | "generatedAt" | "createdAt" | "updatedAt"
    > & {
      analyst: Analyst;
      coverCdnHttpUrl?: string;
    })[]
  >
> {
  return withAuth(async (user) => {
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });
    if (analyst?.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You are not authorized to access this resource.",
      };
    }
    const reports = await prisma.analystReport.findMany({
      where: {
        analystId: analyst.id,
        // generatedAt: { not: null },
      },
      select: {
        id: true,
        token: true,
        analystId: true,
        analyst: true,
        extra: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const reportsWithCoverUrls = reports.map((report) => {
      const { extra, ...rest } = report;
      const objectUrl = (extra as AnalystReportExtra).coverObjectUrl;
      if (objectUrl) {
        const coverCdnHttpUrl = proxiedImageCdnUrl({ objectUrl });
        return { ...rest, coverCdnHttpUrl };
      } else {
        return { ...rest, coverCdnHttpUrl: undefined };
      }
    });

    return {
      success: true,
      data: reportsWithCoverUrls,
    };
  });
}

export async function backgroundGenerateReport({
  analystId,
  instruction = "",
  systemPrompt,
}: {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}): Promise<void> {
  return withAuth(async (user) => {
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
      include: {
        interviews: {
          select: {
            conclusion: true,
          },
        },
      },
    });
    if (analyst?.userId !== user.id) {
      forbidden();
    }

    const reportToken = generateToken();
    const report = await prisma.analystReport.create({
      data: {
        analystId,
        instruction,
        token: reportToken,
        coverSvg: "",
        onePageHtml: "",
      },
    });

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const reportLog = rootLogger.child({
      analystId,
      reportToken,
      method: "backgroundGenerateReport",
    });
    const statReport: StatReporter = async (dimension, value, extra) => {
      reportLog.info(`statReport: ${dimension}=${value} ${JSON.stringify(extra)}`);
    };
    const locale =
      analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
        ? (analyst.locale as Locale)
        : await detectInputLanguage({ text: analyst.brief });

    backgroundWait(
      (async () => {
        await generateReport({
          analyst,
          report,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLog,
          systemPrompt,
        });
        await generateReportScreenshot({
          ...report,
          extra: report.extra as AnalystReportExtra,
          analyst,
        });
        await generateReportCoverSvg({
          analyst,
          report,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: reportLog,
        });
      })(),
      reportLog,
    );
  });
}
