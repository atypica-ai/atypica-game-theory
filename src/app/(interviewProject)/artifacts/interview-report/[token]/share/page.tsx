import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import InterviewReportSharePageClient from "./InterviewReportSharePageClient";

// generateMetadata 需要访问数据库
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { token: reportToken } = await params;
  const report = await prisma.interviewReport.findUnique({
    where: { token: reportToken },
    select: {
      project: {
        select: {
          brief: true,
        },
      },
    },
  });
  if (!report?.project) {
    return {};
  }
  const brief = report.project.brief;
  const title = "📄 " + (brief.length > 30 ? brief.substring(0, 30) + "..." : brief);
  const description = (brief.length > 100 ? brief.substring(0, 100) + "..." : brief).replace(
    /[\n\r]/g,
    " ",
  );
  return generatePageMetadata({ title, description, locale });
}

async function InterviewReportSharePage({ reportToken }: { reportToken: string }) {
  const report = await prisma.interviewReport.findUnique({
    where: { token: reportToken },
    select: {
      project: {
        select: {
          id: true,
          brief: true,
        },
      },
    },
  });
  if (!report) notFound();
  return <InterviewReportSharePageClient reportToken={reportToken} />;
}

export default async function InterviewReportSharePageWithLoading({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewReportSharePage reportToken={token} />
    </Suspense>
  );
}
