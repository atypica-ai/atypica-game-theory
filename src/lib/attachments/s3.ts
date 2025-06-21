import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDeployRegion } from "../request/deployRegion";
import { S3UploadCredentials } from "./types";

const AWS_S3_CONFIG: {
  origin: string;
  bucketName: string;
  region: "cn-north-1" | "us-east-1";
  accessKeyId: string;
  secretAccessKey: string;
}[] = (() => {
  try {
    const configs = JSON.parse(process.env.AWS_S3 ?? "[]");
    return configs;
  } catch (error) {
    console.log("error parsing AWS_S3 env", error);
    return [];
  }
})();

// const s3Client = new S3Client({
//   region: process.env.AWS_S3_REGION!,
//   // endpoint: process.env.AWS_S3_ENDPOINT!,
//   credentials: {
//     accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
//   },
// });
// const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;

function getDefaultSignedUrlParams() {
  const signingDate = new Date();
  signingDate.setHours(0, 0, 0, 0);
  return {
    signingDate,
    expiresIn: 48 * 3600, // URL expires in 48 hours
  };
}

/**
 * @todo 要从 objectUrl 里面识别和获取 s3 bucket 并判断是否支持签名
 */
export async function s3SignedUrl(objectUrl: string): Promise<string> {
  const [origin, key] = (() => {
    if (objectUrl.includes("?")) {
      objectUrl = objectUrl.split("?")[0];
    }
    const objectUrlObject = new URL(objectUrl);
    let origin = objectUrlObject.origin;
    let key = objectUrlObject.pathname;
    if (!origin.endsWith("/")) {
      origin = origin + "/";
    }
    if (key.startsWith("/")) {
      key = key.substring(1);
    }
    return [origin, key];
  })();

  const s3Config = AWS_S3_CONFIG.find((config) => config.origin === origin);
  if (!s3Config) {
    throw new Error(`s3 not configured for origin ${origin}`);
  }

  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });
  const s3Bucket = s3Config.bucketName;

  const getObjectCommand = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
    ...getDefaultSignedUrlParams(),
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

  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((config) => config.region === s3Region);
  if (!s3Config) {
    throw new Error(`s3 not configured for region ${s3Region}`);
  }
  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });
  const s3Bucket = s3Config.bucketName;

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
    ...getDefaultSignedUrlParams(),
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
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((config) => config.region === s3Region);
  if (!s3Config) {
    throw new Error(`s3 not configured for region ${s3Region}`);
  }
  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });
  const s3Bucket = s3Config.bucketName;

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
    ...getDefaultSignedUrlParams(),
  });

  const objectUrl = getObjectUrl.split("?")[0];

  return { getObjectUrl, objectUrl };
}
