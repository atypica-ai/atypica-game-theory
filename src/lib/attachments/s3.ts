import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  // endpoint: process.env.AWS_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;

export async function s3SignedUrl(url: string): Promise<string> {
  const key = (() => {
    let urlPath = url;
    if (urlPath.includes("?")) {
      urlPath = urlPath.split("?")[0];
    }
    try {
      const parsedUrl = new URL(urlPath);
      urlPath = parsedUrl.pathname;
    } catch (e) {
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

export interface S3UploadCredentials {
  putObjectUrl: string;
  getObjectUrl: string;
  objectUrl: string; // s3 object url without signature
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
