import { loadEnvConfig } from "@next/env";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment configuration
loadEnvConfig(process.cwd());

// Parse AWS S3 configuration from environment
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
    console.error("❌ Error parsing AWS_S3 env:", error);
    return [];
  }
})();

// Parse command line arguments
const args = process.argv.slice(2);

function parseArgs() {
  const regionIndex = args.indexOf("--region");
  const region = regionIndex !== -1 && args[regionIndex + 1] ? args[regionIndex + 1] : null;

  const uploadIndex = args.indexOf("--upload");
  const uploadFile = uploadIndex !== -1 && args[uploadIndex + 1] ? args[uploadIndex + 1] : null;

  const isListCommand = args.includes("--list");

  return { region, uploadFile, isListCommand };
}

function getS3Client(region: string) {
  const normalizedRegion = region === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((config) => config.region === normalizedRegion);

  if (!s3Config) {
    throw new Error(`❌ S3 not configured for region ${normalizedRegion}`);
  }

  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });

  return { s3Client, s3Config };
}

async function uploadFile(region: string, filePath: string) {
  try {
    console.log(`📤 Uploading file to ${region} region...`);

    const { s3Client, s3Config } = getS3Client(region);

    // Read file
    const resolvedPath = resolve(filePath);
    const fileBuffer = readFileSync(resolvedPath);
    const fileName = filePath.split("/").pop() || filePath;

    // Generate S3 key with atypica/public/ prefix
    const key = `atypica/public/${fileName}`;

    // Determine content type based on file extension
    const extension = fileName.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      webm: "video/webm",
      pdf: "application/pdf",
      json: "application/json",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      xml: "application/xml",
    };
    const contentType = contentTypeMap[extension || ""] || "application/octet-stream";

    // Upload to S3
    const putObjectCommand = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: "public-read",
    });

    await s3Client.send(putObjectCommand);

    // Generate object URL
    const objectUrl = s3Config.origin.endsWith('/') ? `${s3Config.origin}${key}` : `${s3Config.origin}/${key}`;

    console.log(`✅ File uploaded successfully!`);
    console.log(`📍 Object URL: ${objectUrl}`);
    console.log(`🔑 S3 Key: ${key}`);
    console.log(`📂 Bucket: ${s3Config.bucketName}`);
    console.log(`🌍 Region: ${s3Config.region}`);

    return objectUrl;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    process.exit(1);
  }
}

async function listFiles(region: string) {
  try {
    console.log(`📋 Listing files in ${region} region...`);

    const { s3Client, s3Config } = getS3Client(region);

    const listCommand = new ListObjectsV2Command({
      Bucket: s3Config.bucketName,
      Prefix: "atypica/public/",
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    if (objects.length === 0) {
      console.log("📭 No files found in atypica/public/");
      return;
    }

    console.log(`📂 Found ${objects.length} files in atypica/public/:`);
    console.log("");

    objects.forEach((object, index) => {
      const fileName = object.Key?.replace("atypica/public/", "") || "";
      const size = object.Size ? `${(object.Size / 1024).toFixed(2)} KB` : "Unknown size";
      const lastModified = object.LastModified?.toLocaleString() || "Unknown date";
      const objectUrl = s3Config.origin.endsWith('/') ? `${s3Config.origin}${object.Key}` : `${s3Config.origin}/${object.Key}`;

      console.log(`${index + 1}. ${fileName}`);
      console.log(`   📏 Size: ${size}`);
      console.log(`   📅 Modified: ${lastModified}`);
      console.log(`   🔗 URL: ${objectUrl}`);
      console.log("");
    });

    console.log(`🌍 Region: ${s3Config.region}`);
    console.log(`📂 Bucket: ${s3Config.bucketName}`);
  } catch (error) {
    console.error("❌ List failed:", error);
    process.exit(1);
  }
}

function printUsage() {
  console.log("📚 Usage:");
  console.log("  Upload file: npx tsx scripts/public-assets.ts --region mainland --upload <file-path>");
  console.log("  Upload file: npx tsx scripts/public-assets.ts --region global --upload <file-path>");
  console.log("  List files:  npx tsx scripts/public-assets.ts --region mainland --list");
  console.log("  List files:  npx tsx scripts/public-assets.ts --region global --list");
  console.log("");
  console.log("📋 Examples:");
  console.log("  npx tsx scripts/public-assets.ts --region mainland --upload ./image.png");
  console.log("  npx tsx scripts/public-assets.ts --region global --list");
  console.log("");
  console.log("🌍 Regions:");
  console.log("  mainland - China North 1 (cn-north-1)");
  console.log("  global   - US East 1 (us-east-1)");
}

async function main() {
  const { region, uploadFile: uploadFilePath, isListCommand } = parseArgs();

  // Validate region
  if (!region || !["mainland", "global"].includes(region)) {
    console.error("❌ Please specify a valid region: --region mainland or --region global");
    printUsage();
    process.exit(1);
  }

  // Check if AWS S3 config is available
  if (AWS_S3_CONFIG.length === 0) {
    console.error("❌ AWS S3 configuration not found in environment variables");
    console.error("💡 Please make sure AWS_S3 environment variable is properly configured");
    process.exit(1);
  }

  if (isListCommand) {
    await listFiles(region);
  } else if (uploadFilePath) {
    await uploadFile(region, uploadFilePath);
  } else {
    console.error("❌ Please specify either --upload <file-path> or --list");
    printUsage();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});