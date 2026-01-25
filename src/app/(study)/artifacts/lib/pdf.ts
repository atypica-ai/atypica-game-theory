"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { uploadToS3 } from "@/lib/attachments/s3";
import { getRequestOrigin } from "@/lib/request/headers";
import { AnalystReportExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import { createHash } from "node:crypto";

export async function generateReportPDF(report: {
  id: number;
  token: string;
  userId: number;
  extra: AnalystReportExtra;
  onePageHtml: string;
}): Promise<{
  // pdfBlob: Blob;
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

  // 使用原生 SQL 和 || 操作符安全地只更新 JSON extra 字段中的 pdfObjectUrl。
  // 这种方法的优势：1) 避免并发更新时的竞态条件，2) 优雅地处理 null 值，3) 只更新指定字段而不覆盖 extra 中的其他数据。
  // 其他可选写法：
  // 方法1 - 使用 jsonb_set(): SET extra = jsonb_set(extra, '{pdfObjectUrl}', '"url"'::jsonb, true)
  // 方法2 - 使用 COALESCE: SET extra = COALESCE(extra, '{}'::jsonb) || '{"pdfObjectUrl":"url"}'::jsonb
  // await prisma.$executeRaw`
  //   UPDATE "AnalystReport"
  //   SET extra = extra || ${JSON.stringify({ pdfObjectUrl: objectUrl })}::jsonb
  //   WHERE token = ${reportToken}
  // `;
  await mergeExtra({
    tableName: "AnalystReport",
    id: report.id,
    extra: { pdfObjectUrl: objectUrl },
  });

  return {
    // pdfBlob,
    pdfUrl: getObjectUrl,
  };
}
