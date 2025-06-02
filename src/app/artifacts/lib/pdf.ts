"use server";
import { getRequestOrigin } from "@/lib/request/headers";

export async function generateReportPDF(report: {
  token: string;
  analyst: {
    userId: number;
    id: number;
    topic: string;
  };
  onePageHtml: string;
}): Promise<{
  // pdfBlob: Blob;
  pdfBuffer: Buffer;
}> {
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

  return {
    // pdfBlob,
    pdfBuffer,
  };
}
