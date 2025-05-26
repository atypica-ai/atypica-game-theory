import { prisma } from "@/prisma/prisma";

function injectImgTag(html: string, reportToken: string) {
  const imgTagRegex = /<img([^>]*?)src="(\/api\/imagegen\/[^"]*)"([^>]*?)>/g;
  const modifiedHtml = html.replace(imgTagRegex, (match, beforeSrc, src, afterSrc) => {
    const separator = src.includes("?") ? "&" : "?";
    const newSrc = `${src}${separator}reportToken=${encodeURIComponent(reportToken)}`;
    return `<img${beforeSrc}src="${newSrc}"${afterSrc}>`;
  });
  html = modifiedHtml;
  return html;
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const url = new URL(request.url);
  const isLive = url.searchParams.get("live") === "1";

  // Handle live streaming mode
  if (isLive) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let start = 0;
        while (true) {
          try {
            const analystReport = await prisma.analystReport.findUniqueOrThrow({
              where: { token },
            });
            const onePageHtml = injectImgTag(analystReport.onePageHtml, token);
            const chunk = onePageHtml.substring(start);
            controller.enqueue(encoder.encode(chunk));
            start = onePageHtml.length;
            // If report is complete (has a generatedAt timestamp), end the stream
            if (analystReport.generatedAt) {
              controller.close();
              break;
            }
            // Wait for 3 seconds before fetching again
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } catch (error) {
            console.error("Error streaming report:", error);
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
  const analystReport = await prisma.analystReport.findUniqueOrThrow({
    where: { token },
  });
  const onePageHtml = injectImgTag(analystReport.onePageHtml, token);
  return new Response(onePageHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
