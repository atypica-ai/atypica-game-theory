"use server";
import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { getDeployRegion } from "@/lib/request/deployRegion";

/**
 * @deprecated
 */
export async function reginalS3Url(key: string) {
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config) {
    throw new Error("S3 configuration not found");
  }
  return `${s3Config.origin}${key}`;
}

/**
 * @deprecated
 */
export async function reginalS3Origin() {
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config) {
    throw new Error("S3 configuration not found");
  }
  return `${s3Config.origin}`;
}

export async function getS3CDNUrl(key: string) {
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config?.cdnOrigin) {
    throw new Error("S3 cdnOrigin configuration not found");
  }
  return `${s3Config.cdnOrigin}${key}`; // 无需设置 ?region=cn-north-1|us-east-1, 两个 region 有同样的文件
}

export async function getS3CDNOrigin() {
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config?.cdnOrigin) {
    throw new Error("S3 cdnOrigin configuration not found");
  }
  return `${s3Config.cdnOrigin}`; // 前端使用的时候无需设置 ?region=cn-north-1|us-east-1, 两个 region 有同样的文件
}
