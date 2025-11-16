import { getS3Object } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { AnalystReportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

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
 * Process image to 2000x2000 square jpg using sharp
 */
async function processImageToSquareJpg(imageBuffer: Buffer): Promise<Buffer> {
  const processedBuffer = await sharp(imageBuffer)
    .resize(2000, 2000, {
      fit: "cover", // Crop to cover the entire area
      position: "centre", // Center the crop
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
async function getAndProcessImage(objectUrl: string): Promise<Response | null> {
  try {
    // Get image from S3
    const { fileBody } = await getS3Object(objectUrl);

    // Process image to 2000x2000 square jpg
    const processedBuffer = await processImageToSquareJpg(fileBody);

    return new NextResponse(Uint8Array.from(processedBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable", // 7 days
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

  try {
    // Fetch report data
    const report = await prisma.analystReport.findUnique({
      where: { token: reportToken },
      select: {
        id: true,
        onePageHtml: true,
        extra: true,
      },
    });

    if (!report) {
      return new NextResponse("Report not found", { status: 404 });
    }

    let objectUrl: string | null = null;

    // Step 1: Try to extract first image from HTML body
    const firstImageSrc = extractFirstImageSrc(report.onePageHtml);

    if (firstImageSrc) {
      rootLogger.debug({
        msg: `Found image in report HTML`,
        reportToken,
        imageSrc: firstImageSrc,
      });

      // Check if it's an imagegen API path
      if (firstImageSrc.includes("/api/imagegen/")) {
        objectUrl = await getImageGenObjectUrl(firstImageSrc);
      }

      if (objectUrl) {
        const imageResponse = await getAndProcessImage(objectUrl);
        if (imageResponse) {
          return imageResponse;
        }
      }
    }

    // Step 2: Fallback to report cover image
    rootLogger.debug({
      msg: `No image in HTML, using report cover`,
      reportToken,
    });

    const extra = report.extra as AnalystReportExtra | null;
    if (!extra?.coverObjectUrl) {
      return new NextResponse("No cover image available", { status: 404 });
    }

    const imageResponse = await getAndProcessImage(extra.coverObjectUrl);
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
