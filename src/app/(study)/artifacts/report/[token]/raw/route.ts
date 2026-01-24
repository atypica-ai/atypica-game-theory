import { triggerImagegenInReport } from "@/app/(study)/artifacts/lib/imagegen";
import { getReportCacheFilePath } from "@/app/(study)/artifacts/lib/reportCache";
import { checkAdminAuth } from "@/app/admin/actions";
import { prismaRO } from "@/prisma/prisma";
import { promises as fs } from "fs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function injectImgTag(html: string, reportToken: string) {
  const imgTagRegex = /<img([^>]*?)src="(\/api\/imagegen\/[^"]*)"([^>]*?)>/g;
  const modifiedHtml = html.replace(imgTagRegex, (match, beforeSrc, src, afterSrc) => {
    const separator = src.includes("?") ? "&" : "?";
    const newSrc = `${src}${separator}reportToken=${reportToken}`;
    return `<img${beforeSrc}src="${newSrc}"${afterSrc}>`;
  });
  html = modifiedHtml;
  return html;
}

/**
 * Clean up markdown code blocks that AI models (especially Gemini) often add around HTML content
 */
function cleanHtmlFromMarkdown(html: string): string {
  const cleaned = html
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Extract content between <!DOCTYPE html> and </html>
  const match = cleaned.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i);
  return match ? match[0] : cleaned;
}

/**
 * Get report HTML (from disk if generating, from DB if complete)
 */
async function getReportHtml(reportToken: string): Promise<string> {
  const analystReport = await prismaRO.analystReport.findUniqueOrThrow({
    where: { token: reportToken },
    include: { analyst: true },
  });

  // If report is complete, read from database
  if (analystReport.generatedAt) {
    return cleanHtmlFromMarkdown(analystReport.onePageHtml);
  }

  // If report is generating, read from cache file
  const cachePath = getReportCacheFilePath(analystReport.analyst.userId, reportToken);
  try {
    const html = await fs.readFile(cachePath, "utf-8");
    return cleanHtmlFromMarkdown(html);
  } catch {
    // Fallback to database if cache file doesn't exist
    return cleanHtmlFromMarkdown(analystReport.onePageHtml);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const reportToken = (await params).token;

  const url = new URL(request.url);
  const isLive = url.searchParams.get("live") === "1";
  const isRegenerateImages = url.searchParams.get("regenerateImages") === "1";

  // Handle live streaming mode
  if (isLive) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let start = 0;
        while (true) {
          try {
            const onePageHtml = await getReportHtml(reportToken);
            const chunk = onePageHtml.substring(start);
            controller.enqueue(encoder.encode(chunk));
            start = onePageHtml.length;
            // Check if report is complete
            const analystReport = await prismaRO.analystReport.findUniqueOrThrow({
              where: { token: reportToken },
            });
            if (analystReport.generatedAt) {
              controller.close();
              break;
            }
            // Wait 5 seconds before next poll
            await new Promise((resolve) => setTimeout(resolve, 5000));
            if (request.signal.aborted) {
              // controller.close(); abort 以后就不能调用 close 了
              break;
            }
          } catch (error) {
            console.log("Error streaming report:", error);
            controller.error(error);
            break;
          }
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Regular non-streaming response
  const onePageHtml = await getReportHtml(reportToken);

  if (isRegenerateImages) {
    // 超级管理员可以触发 regenerateImages
    await checkAdminAuth("SUPER_ADMIN");
    await triggerImagegenInReport(onePageHtml, reportToken);
  }

  return new Response(onePageHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
