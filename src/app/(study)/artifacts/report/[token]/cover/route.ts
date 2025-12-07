/**
 * 注意，这个 API 已经不用了，但是这里很多代码值得参考
 */

import { getS3Object } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Extract the first img tag src from HTML
 */
function extractFirstImageSrc(html: string): string | null {
  // Match any img tag and extract its src attribute
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = html.match(imgTagRegex);
  return match ? match[1] : null;
}

/**
 * Get objectUrl from imagegen API path
 * Example: /api/imagegen/prompt?ratio=square
 */
async function getImageGenObjectUrl(imageSrc: string): Promise<string | null> {
  try {
    // Parse the URL to extract prompt and ratio
    const urlParts = imageSrc.split("/");
    const promptWithParams = urlParts[urlParts.length - 1];
    const [prompt, paramsString] = promptWithParams.split("?");
    const params = new URLSearchParams(paramsString || "");
    const ratio = params.get("ratio") || "square";

    // Calculate promptHash (same logic as in imagegen route)
    const promptHash = createHash("sha256")
      .update(JSON.stringify({ prompt, ratio }))
      .digest("hex")
      .substring(0, 40);

    // Query database for objectUrl
    const imageGeneration = await prisma.imageGeneration.findUnique({
      where: { promptHash },
      select: { objectUrl: true, generatedAt: true },
    });

    if (!imageGeneration?.generatedAt || !imageGeneration.objectUrl) {
      rootLogger.warn({
        msg: `Image generation not found or not ready`,
        promptHash,
      });
      return null;
    }

    return imageGeneration.objectUrl;
  } catch (error) {
    rootLogger.error({
      msg: `Error getting imagegen objectUrl`,
      imageSrc,
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Process image to 2000x2000 square jpg with contain (letterbox/pillarbox)
 */
async function processImageToSquareJpg(imageBuffer: Buffer): Promise<Buffer> {
  const processedBuffer = await sharp(imageBuffer)
    // .resize(2000, 2000, {
    //   fit: "contain", // Fit within bounds, maintain aspect ratio with padding
    //   background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background for letterboxing
    // })
    .resize(2000, 2000, {
      fit: "cover",
    })
    .jpeg({
      quality: 90, // High quality JPEG
      mozjpeg: true, // Use mozjpeg for better compression
    })
    .toBuffer();

  return processedBuffer;
}

/**
 * Process image without square crop - maintains aspect ratio with max dimension 2000px
 */
async function processImageNonSquare(imageBuffer: Buffer): Promise<Buffer> {
  const processedBuffer = await sharp(imageBuffer)
    .resize(2000, 2000, {
      fit: "inside", // Maintain aspect ratio, fit within 2000x2000
      withoutEnlargement: true, // Don't enlarge smaller images
    })
    .jpeg({
      quality: 90, // High quality JPEG
      mozjpeg: true, // Use mozjpeg for better compression
    })
    .toBuffer();

  return processedBuffer;
}

/**
 * Get image from S3 and process it
 */
async function getAndProcessImage(
  objectUrl: string,
  options: {
    square: boolean;
    reportUpdatedAt?: Date;
  },
): Promise<Response | null> {
  const { square, reportUpdatedAt } = options;

  try {
    // Get image from S3
    const { fileBody } = await getS3Object(objectUrl);

    // Process image based on square parameter
    const processedBuffer = square
      ? await processImageToSquareJpg(fileBody)
      : await processImageNonSquare(fileBody);

    // Generate ETag based on objectUrl, report update time, and square param
    const etag = createHash("md5")
      .update(`${objectUrl}-${reportUpdatedAt?.getTime() || 0}-square:${square}`)
      .digest("hex");

    return new NextResponse(Uint8Array.from(processedBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable", // 1 year
        ETag: `"${etag}"`,
      },
    });
  } catch (error) {
    rootLogger.error({
      msg: `Error getting or processing image from S3`,
      objectUrl,
      error: (error as Error).message,
    });
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token: reportToken } = await params;

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const inContent = searchParams.get("inContent") === "1";
  const square = searchParams.get("square") === "1"; // Default to false (no square crop)

  try {
    // Fetch report data
    const report = await prisma.analystReport.findUnique({
      where: { token: reportToken },
      select: {
        id: true,
        onePageHtml: true,
        extra: true,
        updatedAt: true,
      },
    });

    if (!report) {
      return new NextResponse("Report not found", { status: 404 });
    }

    let objectUrl: string | null = null;

    // Step 1: Handle based on inContent parameter
    if (inContent) {
      // Extract first image from HTML body
      const firstImageSrc = extractFirstImageSrc(report.onePageHtml);

      if (firstImageSrc) {
        rootLogger.debug({
          msg: `Found image in report HTML (inContent=1)`,
          reportToken,
          imageSrc: firstImageSrc,
        });

        // Check if it's an imagegen API path
        if (firstImageSrc.includes("/api/imagegen/")) {
          objectUrl = await getImageGenObjectUrl(firstImageSrc);
        }

        if (objectUrl) {
          const imageResponse = await getAndProcessImage(objectUrl, {
            square,
            reportUpdatedAt: report.updatedAt,
          });
          if (imageResponse) {
            return imageResponse;
          }
        }
      }

      // If inContent=1 but no image found in HTML, return 404
      return new NextResponse("No image found in report content", { status: 404 });
    }

    // Step 2: Use report cover image (default behavior when inContent != 1)
    rootLogger.debug({
      msg: `Using report coverObjectUrl`,
      reportToken,
    });

    const extra = report.extra as AnalystReportExtra | null;
    if (!extra?.coverObjectUrl) {
      return new NextResponse("No cover image available", { status: 404 });
    }

    const imageResponse = await getAndProcessImage(extra.coverObjectUrl, {
      square,
      reportUpdatedAt: report.updatedAt,
    });
    if (imageResponse) {
      return imageResponse;
    }

    return new NextResponse("Failed to fetch cover image", { status: 500 });
  } catch (error) {
    rootLogger.error({
      msg: `Error in cover route`,
      reportToken,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
