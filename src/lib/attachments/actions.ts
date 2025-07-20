"use server";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { ServerActionResult } from "@/lib/serverAction";
import { AttachmentFile, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { withAuth } from "../request/withAuth";
import { resizeImageToWebP } from "./image";
import { s3SignedUrl, s3UploadCredentials } from "./s3";
import { S3UploadCredentials } from "./types";

export async function recordAttachmentFile({
  ...recordData
}: {
  objectUrl: string;
  name: string;
  mimeType: string;
  size: number;
}): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    try {
      await prisma.attachmentFile.create({
        data: {
          userId: user.id,
          ...recordData,
        },
      });
    } catch (error) {
      rootLogger.error(`Error recording attachment file:${(error as Error).message}`);
    }
    return {
      success: true,
      data: null,
    };
  });
}

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
  return withAuth(async () => {
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
  });
}

/**
 * @todo 这个不应该是个 server action，不过现在有客户端在用，需要重构下
 */
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

export async function getAttachmentFiles(): Promise<ServerActionResult<AttachmentFile[]>> {
  return withAuth(async (user) => {
    try {
      const files = await prisma.attachmentFile.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return {
        success: true,
        data: files,
      };
    } catch (error) {
      rootLogger.error(`Error fetching attachment files: ${(error as Error).message}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  });
}

export async function getSignedUrlForAttachment({
  objectUrl,
}: {
  objectUrl: string;
}): Promise<ServerActionResult<string>> {
  return withAuth(async (user) => {
    try {
      const file = await prisma.attachmentFile.findFirst({
        where: {
          objectUrl,
          userId: user.id,
        },
      });

      if (!file) {
        return {
          success: false,
          message: "File not found or access denied.",
        };
      }

      const url = await s3SignedUrl(objectUrl);
      return {
        success: true,
        data: url,
      };
    } catch (error) {
      rootLogger.error(`Error getting signed URL for ${objectUrl}: ${(error as Error).message}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });
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
