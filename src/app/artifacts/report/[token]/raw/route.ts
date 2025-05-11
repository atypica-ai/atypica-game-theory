import { prisma } from "@/prisma/prisma";

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
            const chunk = analystReport.onePageHtml.substring(start);
            controller.enqueue(encoder.encode(chunk));
            start = analystReport.onePageHtml.length;
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
  return new Response(analystReport.onePageHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
