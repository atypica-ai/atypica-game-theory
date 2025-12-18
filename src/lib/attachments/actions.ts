"use server";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { AttachmentFile } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { withAuth } from "../request/withAuth";
import { AWS_S3_CONFIG, s3SignedUrl, s3UploadCredentials } from "./s3";
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
  acl,
}: {
  fileType: string;
  fileName: string;
  acl?: "public-read";
}): Promise<ServerActionResult<S3UploadCredentials>> {
  return withAuth(async () => {
    try {
      const result = await s3UploadCredentials({ fileType, fileName, acl });
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
 * Convert S3 signed URL to Aliyun CDN URL for global acceleration
 *
 * Aliyun CDN uses conditional routing based on the region parameter:
 * - ?region=us-east-1 → routes to US origin
 * - ?region=cn-north-1 → routes to China origin
 *
 * @param objectUrl - S3 object URL (e.g., https://bucket.s3.region.amazonaws.com/key)
 * @returns CDN URL with region parameter for routing
 */
export async function getS3SignedCdnUrl(objectUrl: string) {
  const signedUrl = await s3SignedUrl(objectUrl);
  const s3Config = AWS_S3_CONFIG.find((config) => signedUrl.startsWith(config.origin));
  if (!s3Config || !s3Config.cdnOrigin) {
    throw new Error(`No cdnOrigin configuration found for URL: ${objectUrl}`);
  }
  const urlObj = new URL(signedUrl.replace(s3Config.origin, s3Config.cdnOrigin));
  // Add region parameter for CDN routing rules
  urlObj.searchParams.set("region", s3Config.region);
  const cdnUrl = urlObj.toString();
  return cdnUrl;
}

export async function getAttachmentFiles(): Promise<
  ServerActionResult<{ file: AttachmentFile; thumbnailHttpUrl?: string }[]>
> {
  return withAuth(async (user) => {
    try {
      const files = await prisma.attachmentFile.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      });
      return {
        success: true,
        data: await Promise.all(
          files.map(async (file) => {
            return {
              file,
              thumbnailHttpUrl: file.mimeType.startsWith("image/")
                ? // await attachmentFileObjectUrlToHttpUrl(file)
                  // proxiedImageCdnUrl({ objectUrl: file.objectUrl, width: 200, quality: 90 })
                  await getS3SignedCdnUrl(file.objectUrl)
                : undefined,
            };
          }),
        ),
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

// export async function getSignedUrlForAttachment({
//   objectUrl,
// }: {
//   objectUrl: string;
// }): Promise<ServerActionResult<string>> {
//   return withAuth(async (user) => {
//     try {
//       const file = await prisma.attachmentFile.findFirst({
//         where: {
//           objectUrl,
//           userId: user.id,
//         },
//       });
//       if (!file) {
//         return {
//           success: false,
//           message: "File not found or access denied.",
//         };
//       }
//       const url = await attachmentFileObjectUrlToHttpUrl(file);
//       return {
//         success: true,
//         data: url,
//       };
//     } catch (error) {
//       rootLogger.error(`Error getting signed URL for ${objectUrl}: ${(error as Error).message}`);
//       return {
//         success: false,
//         message: error instanceof Error ? error.message : "Unknown error occurred",
//       };
//     }
//   });
// }
