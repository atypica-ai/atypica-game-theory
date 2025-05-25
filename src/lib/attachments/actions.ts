"use server";
import { ServerActionResult } from "@/lib/serverAction";
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
