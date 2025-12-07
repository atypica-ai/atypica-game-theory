"use server";
import { generateReportPDF } from "@/app/(study)/artifacts/lib/pdf";
import { withAuth } from "@/lib/request/withAuth";
import { AnalystReportExtra } from "@/prisma/client";
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

    const {
      // pdfBlob
      pdfUrl,
    } = await generateReportPDF({
      ...report,
      extra: report.extra as AnalystReportExtra,
    });

    return {
      fileName,
      // pdfBlob,
      pdfUrl,
    };
  });
}

// export async function reportCoverObjectUrlToHttpUrl(
//   analystReport: Pick<AnalystReport, "id" | "extra">,
// ): Promise<{
//   signedCoverObjectUrl: string;
// } | null> {
//   const extra = analystReport.extra as AnalystReportExtra | null;
//   if (!extra || !extra.coverObjectUrl) {
//     return null;
//   }
//   let signedCoverObjectUrl: string;
//   if (
//     extra.s3SignedCoverObjectUrl &&
//     extra.s3SignedCoverObjectUrlExpiresAt &&
//     extra.s3SignedCoverObjectUrlExpiresAt > Date.now() + 60 * 60 * 1000
//   ) {
//     // s3SignedUrl exists and expires in the next hour
//     signedCoverObjectUrl = extra.s3SignedCoverObjectUrl;
//   } else {
//     const signingDate = new Date();
//     const expiresIn = 7 * 24 * 3600; // in seconds
//     signedCoverObjectUrl = await s3SignedUrl(extra.coverObjectUrl, { signingDate, expiresIn });
//     waitUntil(
//       mergeExtra({
//         tableName: "AnalystReport",
//         id: analystReport.id,
//         extra: {
//           s3SignedCoverObjectUrl: signedCoverObjectUrl,
//           s3SignedCoverObjectUrlExpiresAt: signingDate.valueOf() + expiresIn * 1000,
//         },
//       }),
//     );
//   }
//   return {
//     signedCoverObjectUrl,
//   };
// }
