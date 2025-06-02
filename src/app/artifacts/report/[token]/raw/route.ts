import { imagegen } from "@/app/api/imagegen/[prompt]/actions";
import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";

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
 * 现在每次打开都会 triggerImageGeneration，可以加一个 report 上的标记，比如 extra 里，生成过了就标记下
 */
async function triggerImageGeneration(html: string, reportToken: string) {
  const imgTagRegex = /<img([^>]*?)src="(\/api\/imagegen\/[^"]*)"([^>]*?)>/g;
  const matches = [...html.matchAll(imgTagRegex)];
  const siteOrigin = await getRequestOrigin();
  const promises = Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matches.map(([match, beforeSrc, src, afterSrc], index) => {
      // Extract prompt and ratio from the URL
      const urlParts = src.split("/");
      const prompt = urlParts[urlParts.length - 1].split("?")[0];
      const urlObj = new URL(src, siteOrigin);
      const ratio = urlObj.searchParams.get("ratio") || "";
      return imagegen({ prompt, ratio, reportToken });
    }),
  );
  try {
    await promises;
  } catch (error) {
    rootLogger.error(
      `Error in triggerImageGeneration for report ${reportToken}: ${(error as Error).message}`,
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const analystReport = await prisma.analystReport.findUniqueOrThrow({
    where: { token },
    include: { analyst: true },
  });

  const url = new URL(request.url);
  const isLive = url.searchParams.get("live") === "1";
  // const session = await getServerSession(authOptions);

  // 其实不需要判断这个
  // const isOwner = analystReport.analyst.userId === session?.user?.id;

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
            const onePageHtml = analystReport.onePageHtml;
            // if (isOwner) {
            await triggerImageGeneration(onePageHtml, token);
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
  const onePageHtml = analystReport.onePageHtml;
  // if (isOwner) {
  await triggerImageGeneration(onePageHtml, token);
  return new Response(onePageHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
