"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  // endpoint: process.env.AWS_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResponse {
  putObjectUrl: string;
  getObjectUrl: string;
}

/**
 * Gets a presigned URL for direct frontend upload to S3
 */
export async function getS3UploadCredentials(
  fileType: string,
  fileName: string,
): Promise<ServerActionResult<UploadResponse>> {
  try {
    const fileExtension = fileName.split(".").pop() || "";
    const key = `atypica/${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    });

    const putObjectUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 60 * 5, // URL expires in 5 minutes
    });

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });

    const getObjectUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    return {
      success: true,
      data: { putObjectUrl, getObjectUrl },
    };
  } catch (error) {
    console.error("Error generating S3 upload credentials:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
