"use server";
import { generateReportPDF } from "@/app/artifacts/lib/pdf";
import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { withAuth } from "@/lib/request/withAuth";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { createHash } from "crypto";
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
        token: true,
        onePageHtml: true,
        extra: true,
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

    const topic = report.analyst.topic
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

    const pdfObjectUrl = (report.extra as { pdfObjectUrl?: string } | null)?.pdfObjectUrl;
    if (pdfObjectUrl) {
      const pdfUrl = await s3SignedUrl(pdfObjectUrl);
      return {
        fileName,
        pdfUrl,
      };
    }

    const {
      // pdfBlob
      pdfBuffer,
    } = await generateReportPDF(report);

    const hash = createHash("sha256").update(reportToken).digest("hex").substring(0, 40);
    const { getObjectUrl, objectUrl } = await uploadToS3({
      keySuffix: `pdf/${hash}.pdf`,
      fileBody: new Uint8Array(pdfBuffer),
      mimeType: "application/pdf",
    });

    await prisma.analystReport.update({
      where: { token: reportToken },
      data: {
        extra: {
          ...(report.extra as InputJsonObject),
          pdfObjectUrl: objectUrl,
        },
      },
    });

    return {
      fileName,
      // pdfBlob,
      pdfUrl: getObjectUrl,
    };
  });
}
