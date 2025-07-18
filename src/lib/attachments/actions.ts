"use server";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { ServerActionResult } from "@/lib/serverAction";
import { ChatMessageAttachment } from "@/prisma/client";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resizeImageToWebP } from "./image";
import { s3SignedUrl, s3UploadCredentials } from "./s3";
import { S3UploadCredentials } from "./types";

/**
 * Gets a presigned URL for direct frontend upload to S3
 */
export async function getS3UploadCredentials({
  fileType,
  fileName,
}: {
  fileType: string;
  fileName: string;
}): Promise<ServerActionResult<S3UploadCredentials>> {
  try {
    const result = await s3UploadCredentials({ fileType, fileName });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error generating S3 upload credentials:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function getS3SignedUrl(url: string): Promise<ServerActionResult<string>> {
  try {
    const result = await s3SignedUrl(url);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error generating S3 signed URL:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

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
    buffer = await resizeImageToWebP(buffer, {
      minShortSide: 800,
      maxLongSide: 4000,
    });
    await fs.promises.writeFile(cacheFileFullPath, buffer);
  }

  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 这个暂时用不到了
 */
export async function fileUrlToCdnUrl({
  objectUrl,
  mimeType,
}: ChatMessageAttachment): Promise<{ url: string; contentType: string }> {
  if (!process.env.ATTACHMENT_CDN) {
    throw new Error("ATTACHMENT_CDN environment variable is not set");
  }
  const cdnUrl = `${process.env.ATTACHMENT_CDN}/api/attachment?objectUrl=${encodeURIComponent(objectUrl)}&mimeType=${mimeType}`;
  return mimeType === "application/pdf"
    ? { url: cdnUrl + "&parse=true", contentType: "xxx/txt" }
    : mimeType === "text/plain"
      ? { url: cdnUrl, contentType: "xxx/txt" }
      : { url: cdnUrl, contentType: mimeType };
}
