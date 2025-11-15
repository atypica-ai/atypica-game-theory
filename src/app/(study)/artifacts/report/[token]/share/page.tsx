import { getObjectCdnOrigin } from "@/app/(system)/cdn/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { truncateForTitle } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReportSharePageClient from "./ReportSharePageClient";

export const dynamic = "force-dynamic";

/**
 * 缓存的报告数据查询函数
 *
 * unstable_cache 原理：
 * - 函数参数会自动成为缓存key的一部分
 * - 实际缓存key: ["analyst-report-share", reportToken]
 * - 不同的 reportToken 有独立的缓存项
 * - 缓存时间: 1小时
 *
 * 缓存清除：
 * 在需要清除缓存时使用: revalidateTag("analyst-report-share")
 */
const getCachedReportData = unstable_cache(
  async (reportToken: string) => {
    const report = await prisma.analystReport.findUnique({
      where: { token: reportToken },
      select: {
        id: true,
        token: true,
        analyst: {
          select: {
            brief: true,
            topic: true,
            studyUserChat: {
              select: {
                token: true,
                title: true,
              },
            },
          },
        },
        extra: true,
      },
    });
    return report;
  },
  ["analyst-report-share"], // 基础key + reportToken参数 = 完整缓存key
  {
    tags: ["analyst-report-share"], // 用于批量清除缓存
    revalidate: 3600, // 1小时缓存
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { token: reportToken } = await params;

  const report = await getCachedReportData(reportToken);

  if (!report) {
    return {};
  }

  const title =
    "📝 " +
    truncateForTitle(report.analyst.studyUserChat?.title || report.analyst.brief, {
      maxDisplayWidth: 100,
      suffix: "...",
    });
  const description = truncateForTitle(report.analyst.topic, {
    maxDisplayWidth: 300,
    suffix: "...",
  }).replace(/[\n\r]/g, " ");

  const image = `${getObjectCdnOrigin()}/artifacts/report/${reportToken}/cover`;

  return generatePageMetadata({ title, description, locale, image });
}

async function ReportSharePage({ reportToken }: { reportToken: string }) {
  // 使用同一个缓存查询 - 会命中缓存，不会重复数据库请求
  const report = await getCachedReportData(reportToken);
  if (!report) notFound();
  if (!report.analyst?.studyUserChat?.token) notFound();

  const studyReplayUrl = `/study/${report.analyst.studyUserChat.token}/share?replay=1`;
  return (
    <ReportSharePageClient
      reportToken={reportToken}
      studyTitle={report.analyst.studyUserChat.title}
      studyReplayUrl={studyReplayUrl}
    />
  );
}

export default async function ReportSharePageWithLoading({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ReportSharePage reportToken={token} />
    </Suspense>
  );
}
