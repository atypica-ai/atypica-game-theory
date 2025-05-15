"use server";
import { withAuth } from "@/lib/request/withAuth";
import { prisma } from "@/prisma/prisma";
import { forbidden } from "next/navigation";

export async function generateReportPDF(reportToken: string): Promise<{
  fileName: string;
  pdfBlob: Blob;
}> {
  return withAuth(async (user) => {
    const report = await prisma.analystReport.findUniqueOrThrow({
      where: { token: reportToken },
      select: {
        onePageHtml: true,
        analyst: {
          select: {
            id: true,
            topic: true,
          },
        },
      },
    });
    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: { userId_analystId: { userId: user.id, analystId: report.analyst.id } },
    });
    if (!userAnalyst) {
      forbidden();
    }
    const filename = reportToken;
    const apiBase = process.env.HTML_TO_PDF_API;
    if (!apiBase) {
      throw new Error("HTML_TO_PDF_API environment variable is not set");
    }
    // const origin = await getRequestOrigin();
    const response = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // url: `${origin}/artifacts/report/${reportToken}/raw`,
        html: report.onePageHtml,
        filename: filename,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }
    const pdfBlob = await response.blob();
    const topicExcept = report.analyst.topic
      .replace(/\s+/g, "-")
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\./g, "")
      .slice(0, 20);
    const fileName = `[Report]${topicExcept}[${reportToken}].pdf`;
    return {
      fileName,
      pdfBlob,
    };
  });
}
