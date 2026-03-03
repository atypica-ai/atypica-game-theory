"use server";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { AttachmentFile } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { withAuth } from "../request/withAuth";
import { s3SignedCdnUrl, s3UploadCredentials } from "./s3";
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

export async function getS3SignedCdnUrl(objectUrl: string) {
  return s3SignedCdnUrl(objectUrl);
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
