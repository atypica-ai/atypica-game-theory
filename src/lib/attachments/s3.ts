import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpsProxyAgent } from "hpagent";
import { getDeployRegion } from "../request/deployRegion";
import { S3UploadCredentials } from "./types";

export const AWS_S3_CONFIG: {
  origin: string;
  cdnOrigin?: string;
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
    expiresIn: 48 * 3600, // URL expires in 48 hours, in seconds
  };
}

/**
 * @todo 要从 objectUrl 里面识别和获取 s3 bucket 并判断是否支持签名
 *
 * @param expiresIn - The number of seconds until the signed URL expires
 */
export async function s3SignedUrl(
  objectUrl: string,
  options?: { signingDate: Date; expiresIn: number },
): Promise<string> {
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

  const signedUrl = await getSignedUrl(
    s3Client,
    getObjectCommand,
    options ?? getDefaultSignedUrlParams(),
  );

  return signedUrl;
}

export async function s3UploadCredentials({
  fileType,
  fileName,
  acl,
}: {
  fileType: string;
  fileName: string;
  acl?: "public-read";
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
    ...(acl && { ACL: acl }),
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

/**
 * Get S3 object content and mimetype directly from objectUrl
 * @param objectUrl - The S3 object URL
 * @returns Object containing fileBody and mimeType
 */
export async function getS3Object(objectUrl: string): Promise<{
  fileBody: Buffer;
  mimeType: string;
}> {
  // Parse objectUrl to get origin and key
  const [origin, key] = (() => {
    let url = objectUrl;
    if (url.includes("?")) {
      url = url.split("?")[0];
    }
    const urlObject = new URL(url);
    let origin = urlObject.origin;
    let key = urlObject.pathname;
    if (!origin.endsWith("/")) {
      origin = origin + "/";
    }
    if (key.startsWith("/")) {
      key = key.substring(1);
    }
    return [origin, key];
  })();

  // Find matching S3 config
  const s3Config = AWS_S3_CONFIG.find((config) => config.origin === origin);
  if (!s3Config) {
    throw new Error(`s3 not configured for origin ${origin}`);
  }

  // Create S3 client
  let s3Client: S3Client;
  if (process.env.FETCH_HTTPS_PROXY) {
    const httpsProxyAgent = new HttpsProxyAgent({ proxy: process.env.FETCH_HTTPS_PROXY });
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      requestHandler: new NodeHttpHandler({
        httpsAgent: httpsProxyAgent,
      }),
    });
  } else {
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  const s3Bucket = s3Config.bucketName;

  // Get object from S3
  const getObjectCommand = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  const response = await s3Client.send(getObjectCommand);

  if (!response.Body) {
    throw new Error(`No body in S3 object response for ${objectUrl}`);
  }

  // Convert stream to buffer
  const fileBody = await response.Body.transformToByteArray();
  const mimeType = response.ContentType || "application/octet-stream";

  return {
    fileBody: Buffer.from(fileBody),
    mimeType,
  };
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
export async function s3SignedCdnUrl(objectUrl: string) {
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
