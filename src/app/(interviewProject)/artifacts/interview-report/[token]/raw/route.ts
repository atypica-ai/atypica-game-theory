import { prisma } from "@/prisma/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const reportToken = (await params).token;

  try {
    const interviewReport = await prisma.interviewReport.findUniqueOrThrow({
      where: { token: reportToken },
      include: {
        project: {
          select: { brief: true },
        },
      },
    });

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
              const report = await prisma.interviewReport.findUniqueOrThrow({
                where: { token: reportToken },
              });
              const onePageHtml = report.onePageHtml;
              const chunk = onePageHtml.substring(start);
              controller.enqueue(encoder.encode(chunk));
              start = onePageHtml.length;

              // If report is complete (has a generatedAt timestamp), end the stream
              if (report.generatedAt) {
                controller.close();
                break;
              }

              // Wait for 5 seconds before fetching again
              await new Promise((resolve) => setTimeout(resolve, 5000));
              if (request.signal.aborted) {
                break;
              }
            } catch (error) {
              console.error("Error streaming interview report:", error);
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
    const onePageHtml = interviewReport.onePageHtml;

    return new Response(onePageHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return new Response("Report not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
