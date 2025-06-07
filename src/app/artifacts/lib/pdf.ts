"use server";
import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { getRequestOrigin } from "@/lib/request/headers";
import { AnalystReportExtra } from "@/prisma/client";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { createHash } from "node:crypto";

export async function generateReportPDF(report: {
  token: string;
  analyst: {
    userId: number;
    id: number;
    topic: string;
  };
  extra: AnalystReportExtra;
  onePageHtml: string;
}): Promise<{
  // pdfBlob: Blob;
  pdfUrl: string;
}> {
  const pdfObjectUrl = report.extra?.pdfObjectUrl;
  if (pdfObjectUrl) {
    const pdfUrl = await s3SignedUrl(pdfObjectUrl);
    return {
      pdfUrl,
    };
  }

  const reportToken = report.token;
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
  // const pdfBlob = await response.blob();
  const pdfBuffer = Buffer.from(await response.arrayBuffer());

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
    // pdfBlob,
    pdfUrl: getObjectUrl,
  };
}
