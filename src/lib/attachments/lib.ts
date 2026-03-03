import "server-only";

import { rootLogger } from "@/lib/logging";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resizeImageToWebP } from "./image";
import { s3SignedCdnUrl } from "./s3";

export async function fileUrlToDataUrl({
  objectUrl,
  mimeType: originalMimeType,
}: {
  objectUrl: string;
  mimeType: string;
}): Promise<`data:${string};base64,${string}`> {
  const cacheDir = path.join(process.cwd(), ".next/cache/attachments");
  // if (!fs.existsSync(cacheDir)) {
  const hash = createHash("sha256").update(objectUrl).digest("hex");
  await fs.promises.mkdir(path.join(cacheDir, hash), { recursive: true });

  let fileName = objectUrl.split("/").pop() as string;
  let mimeType = originalMimeType;
  if (mimeType.startsWith("image/")) {
    fileName = `${fileName}.webp`;
    mimeType = "image/webp";
  }

  const cacheFileFullPath = path.join(cacheDir, hash, fileName);
  let buffer: Buffer;
  if (fs.existsSync(cacheFileFullPath)) {
    buffer = await fs.promises.readFile(cacheFileFullPath);
  } else {
    const url = await s3SignedCdnUrl(objectUrl);
    const response = await fetch(url);
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
        // 更新 mimeType 为 webp, 这里不需要了，上面已经实现了
        // mimeType = "image/webp";
      } catch (error) {
        rootLogger.error(`Failed to process image: ${error}`);
        // 如果图片处理失败（说明不支持），使用原始文件，但文件名保留 .webp 后缀，这样下次可以命中缓存
        mimeType = originalMimeType;
      }
    }
    await fs.promises.writeFile(cacheFileFullPath, buffer);
  }

  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}
