import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportSharePageClient from "./ReportSharePageClient";

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
