"use server";
import { getRequestOrigin } from "@/lib/request/headers";
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
            userId: true,
          },
        },
      },
    });
    if (report.analyst.userId !== user.id) {
      forbidden();
    }
    const filename = reportToken;
    const apiBase = process.env.BROWSER_API_BASE_URL;
    if (!apiBase) {
      throw new Error("BROWSER_API_BASE_URL environment variable is not set");
    }
    const origin = await getRequestOrigin();
    const response = await fetch(`${apiBase}/html-to-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `${origin}/artifacts/report/${reportToken}/raw`, // 要加载图像，不能用 html 得用 url
        // html: report.onePageHtml,
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
