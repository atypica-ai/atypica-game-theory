"use server";
import { prisma } from "@/prisma/prisma";

export async function generateReportPDF(reportToken: string): Promise<{
  fileName: string;
  pdfBlob: Blob;
}> {
  const report = await prisma.analystReport.findUniqueOrThrow({
    where: { token: reportToken },
    select: {
      onePageHtml: true,
      analyst: {
        select: {
          topic: true,
        },
      },
    },
  });
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
}
