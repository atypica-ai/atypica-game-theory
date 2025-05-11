import { prisma } from "@/prisma/prisma";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportSharePageClient from "./ReportSharePageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token: reportToken } = await params;
  const report = await prisma.analystReport.findUnique({
    where: { token: reportToken },
    select: {
      analyst: {
        select: {
          topic: true,
          studySummary: true,
        },
      },
    },
  });
  if (!report?.analyst) {
    return {};
  }
  const topic = report.analyst.topic;
  const summary = report.analyst.studySummary;
  const title = "📝 " + (topic.length > 20 ? topic.substring(0, 30) + "..." : topic);
  const description = (summary.length > 100 ? summary.substring(0, 100) + "..." : summary).replace(
    /[\n\r]/g,
    " ",
  );
  return generatePageMetadata({ title, description });
}

export default async function ReportSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: reportToken } = await params;
  const report = await prisma.analystReport.findUnique({
    where: { token: reportToken },
    select: {
      analyst: {
        select: {
          studyUserChat: { select: { token: true } },
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
      analystTopic={report.analyst.topic}
      studyReplayUrl={studyReplayUrl}
    />
  );
}
