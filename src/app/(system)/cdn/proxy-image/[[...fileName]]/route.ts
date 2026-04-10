import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { NextResponse } from "next/server";
import sharp from "sharp";

/**
 * @description Proxy and optionally resize/compress external images.
 * The fileName segment is cosmetic (used for a readable URL) — only the
 * `url`, `w`, `h`, and `q` query params are used.
 */
export async function GET(
  request: Request,
  {}: {
    params: Promise<{ fileName?: string[] }>;
  },
) {
  const { searchParams } = new URL(request.url);

  if (!searchParams.has("url")) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const imageSrc = searchParams.get("url") as string;

  const imageResponse = await proxiedFetch(imageSrc);
  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }

  try {
    let imageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("Content-Type") || "image/jpeg";

    const width = searchParams.get("w");
    const height = searchParams.get("h");
    const quality = searchParams.get("q");

    if (width || height || quality) {
      try {
        let sharpInstance = sharp(imageData);

        if (width || height) {
          const widthNum = width ? parseInt(width, 10) : undefined;
          const heightNum = height ? parseInt(height, 10) : undefined;

          const isValidWidth =
            widthNum === undefined || (!isNaN(widthNum) && widthNum > 0 && widthNum <= 3840);
          const isValidHeight =
            heightNum === undefined || (!isNaN(heightNum) && heightNum > 0 && heightNum <= 3840);

          if (isValidWidth && isValidHeight) {
            if (widthNum && heightNum) {
              sharpInstance = sharpInstance.resize(widthNum, heightNum, { fit: "cover" });
            } else if (widthNum) {
              sharpInstance = sharpInstance.resize({ width: widthNum });
            } else if (heightNum) {
              sharpInstance = sharpInstance.resize({ height: heightNum });
            }
          }
        }

        if (quality) {
          const qualityNum = parseInt(quality, 10);
          if (!isNaN(qualityNum) && qualityNum >= 1 && qualityNum <= 100) {
            if (contentType.includes("jpeg") || contentType.includes("jpg")) {
              sharpInstance = sharpInstance.jpeg({ quality: qualityNum });
            } else if (contentType.includes("png")) {
              sharpInstance = sharpInstance.png({ quality: qualityNum });
            } else if (contentType.includes("webp")) {
              sharpInstance = sharpInstance.webp({ quality: qualityNum });
            }
          }
        }

        imageData = await sharpInstance.toBuffer();
      } catch (sharpError) {
        rootLogger.debug({ msg: "Sharp processing error", error: String(sharpError) });
        // Fall through and return the original image data
      }
    }

    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    rootLogger.error({ msg: "Failed to process image", error: (error as Error).message });
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
