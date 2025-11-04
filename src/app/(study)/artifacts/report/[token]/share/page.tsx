import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { truncateForTitle } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReportSharePageClient from "./ReportSharePageClient";

// generateMetadata 需要访问数据库
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { token: reportToken } = await params;
  const report = await prisma.analystReport.findUnique({
    where: { token: reportToken },
    select: {
      analyst: {
        select: {
          brief: true,
          topic: true,
          studyUserChat: { select: { title: true } },
        },
      },
    },
  });
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
  return generatePageMetadata({ title, description, locale });
}

async function ReportSharePage({ reportToken }: { reportToken: string }) {
  const report = await prisma.analystReport.findUnique({
    where: { token: reportToken },
    select: {
      analyst: {
        select: {
          studyUserChat: {
            select: {
              token: true,
              title: true,
            },
          },
          topic: true,
        },
      },
    },
  });
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
