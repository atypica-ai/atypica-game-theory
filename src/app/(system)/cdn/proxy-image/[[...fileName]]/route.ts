// node 18 和 20 的 fetch 函数不直接使用代理，需要额外实现
// https://stackoverflow.com/questions/72306101/make-a-request-in-native-fetch-with-proxy-in-nodejs-18
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { NextResponse } from "next/server";
import sharp from "sharp";

/**
 * @description 参数里有一个 fileName, 这个文件名没有用到，只是在 url 上面显示，这样用来直接通过 url 下载的时候有文件名
 */
export async function GET(
  request: Request,
  {
    // params,
  }: {
    params: Promise<{ fileName?: string[] }>;
  },
) {
  const { searchParams } = new URL(request.url);

  let imageSrc: string;
  if (searchParams.has("url")) {
    imageSrc = searchParams.get("url") as string;
  } else if (searchParams.has("objectUrl")) {
    const objectUrl = searchParams.get("objectUrl") as string;
    const signingDate = new Date();
    const expiresIn = 7 * 24 * 3600; // in seconds
    try {
      imageSrc = await s3SignedUrl(objectUrl, { signingDate, expiresIn });
    } catch {
      // objectUrl 不是有效的 S3 域名，这时候只支持 url 参数
      return NextResponse.json({ error: "Invalid object url origin" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

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

    // 如果有 width、height 或 quality 参数，使用 sharp 处理图像
    if (width || height || quality) {
      try {
        let sharpInstance = sharp(imageData);

        // 处理尺寸调整
        if (width || height) {
          const widthNum = width ? parseInt(width, 10) : undefined;
          const heightNum = height ? parseInt(height, 10) : undefined;

          // 验证参数有效性
          const isValidWidth =
            widthNum === undefined || (!isNaN(widthNum) && widthNum > 0 && widthNum <= 3840);
          const isValidHeight =
            heightNum === undefined || (!isNaN(heightNum) && heightNum > 0 && heightNum <= 3840);

          if (isValidWidth && isValidHeight) {
            // 如果同时提供 width 和 height，使用 cover 模式进行裁剪
            if (widthNum && heightNum) {
              sharpInstance = sharpInstance.resize(widthNum, heightNum, {
                fit: "cover",
              });
            }
            // 只提供 width，保持宽高比
            else if (widthNum) {
              sharpInstance = sharpInstance.resize({ width: widthNum });
            }
            // 只提供 height，保持宽高比
            else if (heightNum) {
              sharpInstance = sharpInstance.resize({ height: heightNum });
            }
          }
        }

        // 处理质量调整（根据图像类型）
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
        rootLogger.debug(`Sharp processing error: ${sharpError}`);
        // 如果 sharp 处理失败，返回原图像数据
      }
    }

    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    rootLogger.error(`Failed to process image: ${(error as Error).message}`);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
