"use server";
import { reportCoverObjectUrlToHttpUrl } from "@/app/(study)/artifacts/report/actions";
import { uploadToS3 } from "@/lib/attachments/s3";
import { getRequestOrigin } from "@/lib/request/headers";
import { AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createHash } from "node:crypto";

export async function generateReportScreenshot(report: {
  id: number;
  token: string;
  analyst: {
    userId: number;
    id: number;
    topic: string;
  };
  extra: AnalystReportExtra;
  onePageHtml: string;
}): Promise<{
  // screenshotBlob: Blob;
  coverUrl: string;
}> {
  const result = await reportCoverObjectUrlToHttpUrl(report);
  if (result) {
    const coverUrl = result.signedCoverObjectUrl;
    return {
      coverUrl,
    };
  }

  const reportToken = report.token;
  const filename = reportToken;
  const apiBase = process.env.BROWSER_API_BASE_URL;
  if (!apiBase) {
    throw new Error("BROWSER_API_BASE_URL environment variable is not set");
  }
  const origin = await getRequestOrigin();
  const response = await fetch(`${apiBase}/screenshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${origin}/artifacts/report/${reportToken}/raw`,
      // html: report.onePageHtml,
      filename: filename,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate screenshot: ${response.statusText}`);
  }
  // const screenshotBlob = await response.blob();
  const screenshotBuffer = Buffer.from(await response.arrayBuffer());

  const hash = createHash("sha256").update(reportToken).digest("hex").substring(0, 40);
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `screenshot/${hash}.png`,
    fileBody: new Uint8Array(screenshotBuffer),
    mimeType: "image/png",
  });

  await prisma.$executeRaw`
    UPDATE "AnalystReport"
    SET extra = extra || ${JSON.stringify({ coverObjectUrl: objectUrl })}::jsonb
    WHERE token = ${reportToken}
  `;

  return {
    // screenshotBlob,
    coverUrl: getObjectUrl,
  };
}
