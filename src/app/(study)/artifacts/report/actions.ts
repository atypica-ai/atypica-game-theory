"use server";
import { generateReportPDF } from "@/app/(study)/artifacts/lib/pdf";
import { withAuth } from "@/lib/request/withAuth";
import { prisma } from "@/prisma/prisma";
import { forbidden } from "next/navigation";

export async function generateReportPDFAction(reportToken: string): Promise<{
  fileName: string;
  // pdfBlob: Blob;
  pdfUrl: string;
}> {
  return withAuth(async (user) => {
    const report = await prisma.analystReport.findUniqueOrThrow({
      where: { token: reportToken },
      select: {
        id: true,
        userId: true,
        token: true,
        onePageHtml: true,
        extra: true,
      },
    });
    if (report.userId !== user.id) {
      forbidden();
    }

    const topic = (report.extra.description ?? "")
      .replace(/\s+/g, " ")
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\./g, "");
    // Check if topic contains Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(topic);
    let topicExcept: string;
    if (hasChinese) {
      // For Chinese: limit to 20 characters
      topicExcept = topic.slice(0, 20);
    } else {
      // For English: limit to 10 words
      const words = topic.split(" ");
      topicExcept = words.slice(0, 10).join(" ");
    }
    const fileName = `${topicExcept} [${reportToken}].pdf`;

    const {
      // pdfBlob
      pdfUrl,
    } = await generateReportPDF({
      ...report,
      userId: report.userId,
      extra: report.extra,
    });

    return {
      fileName,
      // pdfBlob,
      pdfUrl,
    };
  });
}
