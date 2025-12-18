import "server-only";

import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resizeImageToWebP } from "./image";
import { s3SignedUrl } from "./s3";

export async function fileUrlToDataUrl({
  objectUrl,
  mimeType,
}: {
  objectUrl: string;
  mimeType: string;
}): Promise<`data:${string};base64,${string}`> {
  const cacheDir = path.join(process.cwd(), ".next/cache/attachments");
  // if (!fs.existsSync(cacheDir)) {
  const hash = createHash("sha256").update(objectUrl).digest("hex");
  await fs.promises.mkdir(path.join(cacheDir, hash), { recursive: true });
  let buffer: Buffer;
  const url = await s3SignedUrl(objectUrl);
  const fileName = objectUrl.split("/").pop() as string;
  const cacheFileFullPath = path.join(cacheDir, hash, fileName);
  if (fs.existsSync(cacheFileFullPath)) {
    buffer = await fs.promises.readFile(cacheFileFullPath);
  } else {
    let response;
    if (getDeployRegion() === "mainland" && !/amazonaws\.com\.cn/.test(objectUrl)) {
      response = await proxiedFetch(url);
    } else {
      response = await fetch(url);
    }
    if (!response.ok) {
      const errorMsg = `Failed to fetch file: ${url} ${response.status} ${response.statusText}`;
      rootLogger.error(errorMsg);
      throw new Error(errorMsg);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    // 只对图片文件进行图片处理
    if (mimeType.startsWith("image/")) {
      try {
        buffer = await resizeImageToWebP(buffer, {
          minShortSide: 800,
          maxLongSide: 4000,
        });
        // 更新 mimeType 为 webp
        mimeType = "image/webp";
      } catch (error) {
        rootLogger.error(`Failed to process image: ${error}`);
        // 如果图片处理失败，使用原始文件
      }
    }
    await fs.promises.writeFile(cacheFileFullPath, buffer);
  }

  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}
