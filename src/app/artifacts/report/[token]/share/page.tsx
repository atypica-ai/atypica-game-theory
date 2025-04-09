import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportSharePageClient from "./ReportSharePageClient";

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
        },
      },
    },
  });
  if (report?.analyst) {
    const topic = report.analyst.topic;
    const title = topic.length > 20 ? topic.substring(0, 30) + "..." : topic;
    return { title };
  }
  return {};
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
