import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { rootLogger } from "../logging";
import { S3UploadCredentials } from "./types";

export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  // endpoint: process.env.AWS_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;

/**
 * @todo 要从 url 里面识别和获取 s3 bucket 并判断是否支持签名
 */
export async function s3SignedUrl(url: string): Promise<string> {
  const key = (() => {
    let urlPath = url;
    if (urlPath.includes("?")) {
      urlPath = urlPath.split("?")[0];
    }
    try {
      const parsedUrl = new URL(urlPath);
      urlPath = parsedUrl.pathname;
    } catch (error) {
      rootLogger.error(`Something went wrong when parsing the URL: ${(error as Error).message}`);
      urlPath = urlPath.startsWith("/") ? urlPath : "/" + urlPath;
    }
    if (urlPath.startsWith("/")) {
      urlPath = urlPath.substring(1);
    }
    return urlPath;
  })();

  const getObjectCommand = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600, // URL expires in 1 hour
  });

  return signedUrl;
}

export async function s3UploadCredentials({
  fileType,
  fileName,
}: {
  fileType: string;
  fileName: string;
}): Promise<S3UploadCredentials> {
  const fileExtension = fileName.split(".").pop() || "";
  const key = `atypica/${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

  const putObjectCommand = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    ContentType: fileType,
  });

  const putObjectUrl = await getSignedUrl(s3Client, putObjectCommand, {
    expiresIn: 60 * 5, // URL expires in 5 minutes
  });

  const getObjectCommand = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  const getObjectUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600, // URL expires in 1 hour
  });

  const objectUrl = getObjectUrl.split("?")[0];

  return { putObjectUrl, getObjectUrl, objectUrl };
}

export async function uploadToS3({
  keySuffix,
  fileBody,
  mimeType,
}: {
  keySuffix: `${string}/${string}.${string}`;
  fileBody: Uint8Array<ArrayBufferLike>;
  mimeType: string;
}) {
  const key = `atypica/${keySuffix}`;

  const putObjectCommand = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: fileBody,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await s3Client.send(putObjectCommand);

  const getObjectCommand = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  const getObjectUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600, // URL expires in 1 hour
  });

  const objectUrl = getObjectUrl.split("?")[0];

  return { getObjectUrl, objectUrl };
}
