"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { getRequestOrigin } from "@/lib/request/headers";
import { InterviewReportExtra, InterviewSessionExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { createHash } from "node:crypto";

export async function generateInterviewReportPDF(report: {
  id: number;
  token: string;
  project: {
    id: number;
    title: string;
  };
  extra: InterviewReportExtra;
  onePageHtml: string;
}): Promise<{
  pdfUrl: string;
}> {
  const pdfObjectUrl = report.extra?.pdfObjectUrl;
  if (pdfObjectUrl) {
    return {
      pdfUrl: await getS3SignedCdnUrl(pdfObjectUrl),
      // proxiedObjectCdnUrl({
      //   objectUrl: pdfObjectUrl,
      //   mimeType: "application/pdf",
      // }),
    };
  }

  const reportToken = report.token;
  const filename = reportToken;
  const apiBase = process.env.BROWSER_API_BASE_URL;
  if (!apiBase) {
    throw new Error("BROWSER_API_BASE_URL environment variable is not set");
  }
  const origin = await getRequestOrigin();
  const response = await fetch(`${apiBase}/html-to-paginated-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${origin}/artifacts/interview-report/${reportToken}/raw`, // 要加载图像，不能用 html 得用 url
      filename: filename,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate PDF: ${response.statusText}`);
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  const hash = createHash("sha256").update(reportToken).digest("hex").substring(0, 40);
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `pdf/interview-report/${hash}.pdf`,
    fileBody: new Uint8Array(pdfBuffer),
    mimeType: "application/pdf",
  });

  await prisma.$executeRaw`
    UPDATE "InterviewReport"
    SET extra = extra || ${JSON.stringify({ pdfObjectUrl: objectUrl })}::jsonb
    WHERE token = ${reportToken}
  `;

  await mergeExtra({
    tableName: "InterviewReport",
    id: report.id,
    extra: { pdfObjectUrl: objectUrl },
  });

  return {
    pdfUrl: getObjectUrl,
  };
}

export async function generateInterviewTranscriptPDF(transcript: {
  userChatToken: string;
  sessionId: number;
  extra: InterviewSessionExtra;
  locale: string;
}): Promise<{
  pdfUrl: string;
}> {
  // Check if PDF already exists
  if (transcript.extra?.pdfObjectUrl) {
    const pdfUrl = await s3SignedUrl(transcript.extra.pdfObjectUrl);
    return {
      pdfUrl,
    };
  }

  // Generate PDF
  const apiBase = process.env.BROWSER_API_BASE_URL;
  if (!apiBase) {
    throw new Error("PDF generation service not configured");
  }

  const origin = await getRequestOrigin();
  const transcriptUrl = `${origin}/artifacts/interview-transcript/${transcript.userChatToken}/raw?locale=${transcript.locale}&theme=light`;

  const response = await fetch(`${apiBase}/html-to-paginated-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: transcriptUrl,
      filename: transcript.userChatToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate PDF: ${response.statusText}`);
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  // Upload to S3
  const hash = createHash("sha256")
    .update(`transcript-${transcript.userChatToken}`)
    .digest("hex")
    .substring(0, 40);

  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `interview-transcript-pdf/${hash}.pdf`,
    fileBody: new Uint8Array(pdfBuffer),
    mimeType: "application/pdf",
  });

  // Save PDF URL to session extra
  await prisma.$executeRaw`
    UPDATE "InterviewSession"
    SET extra = extra || ${JSON.stringify({ pdfObjectUrl: objectUrl })}::jsonb
    WHERE id = ${transcript.sessionId}
  `;

  return {
    pdfUrl: getObjectUrl,
  };
}
