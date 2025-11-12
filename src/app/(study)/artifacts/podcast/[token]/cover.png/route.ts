import { fetchPodcastByToken } from "@/app/(study)/artifacts/podcast/actions";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Fetch podcast data
    const result = await fetchPodcastByToken(token);
    if (!result.success || !result.data.report?.coverSvg) {
      return new NextResponse("Cover not found", { status: 404 });
    }

    const { coverSvg } = result.data.report;

    // Convert SVG string to Buffer
    const svgBuffer = Buffer.from(coverSvg);

    // Get SVG dimensions (assuming 2:1 aspect ratio, e.g., 1200x600)
    // We'll create a square image with padding
    const targetSize = 1200; // Square size

    // First, convert SVG to PNG with original aspect ratio
    const originalImage = await sharp(svgBuffer)
      .resize({ width: targetSize, fit: "inside" })
      .png()
      .toBuffer();

    // Get the actual dimensions after resize
    const metadata = await sharp(originalImage).metadata();
    const { width = targetSize, height = targetSize / 2 } = metadata;

    // Calculate padding to center the image in a square
    const paddingTop = Math.floor((targetSize - height) / 2);
    const paddingBottom = targetSize - height - paddingTop;
    const paddingLeft = Math.floor((targetSize - width) / 2);
    const paddingRight = targetSize - width - paddingLeft;

    // Create square image with padding (white background)
    const squareImage = await sharp(originalImage)
      .extend({
        top: paddingTop,
        bottom: paddingBottom,
        left: paddingLeft,
        right: paddingRight,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    // Return image with appropriate headers
    return new NextResponse(squareImage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error generating podcast cover:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
