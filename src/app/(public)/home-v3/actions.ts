"use server";
import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { getDeployRegion } from "@/lib/request/deployRegion";

export async function reginalS3Url(key: string) {
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config) {
    throw new Error("S3 configuration not found");
  }
  return `${s3Config.origin}${key}`;
}
