import { generateGPTImage } from "@/app/(study)/artifacts/lib/imagegen";
import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "crypto";

async function syncToS3MultipleRegions({
  fileBody,
  mimeType,
  key,
}: {
  fileBody: Buffer;
  mimeType: string;
  key: string;
}) {
  for (const s3Config of AWS_S3_CONFIG) {
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
      Body: fileBody,
      ContentType: mimeType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    });
    await s3Client.send(putObjectCommand);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ prompt: string }> }) {
  const { prompt } = await params;
  const ratio = "square";

  const promptHash = createHash("sha256")
    .update(JSON.stringify({ prompt, ratio }))
    .digest("hex")
    .substring(0, 40);
  const s3Key = `atypica/public/${promptHash}.png`;

  // return new Response("Not allowed", { status: 403 });
  const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
  const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
  if (!s3Config) {
    throw new Error(`No S3 config found for region ${s3Region}`);
  }
  const fullUrl = `${s3Config.origin}${s3Key}`;
  const s3ImageResponse = await fetch(fullUrl);
  if (s3ImageResponse.ok) {
    const imageBuffer = await s3ImageResponse.arrayBuffer();
    return new Response(Buffer.from(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.byteLength.toString(),
      },
    });
  }

  // 还没生成过，继续后面的流程，生成图片
  console.log(`Image ${s3Key} not found, continue to generate`);
  if (process.env.NODE_ENV !== "development") {
    throw new Error("dev imagegen api is only available in development mode");
  }

  // const fileFullPath = path.join(process.cwd(), `public/_public/images/${promptHash}.png`);
  // if (fs.existsSync(fileFullPath)) {
  //   const buffer = await fs.promises.readFile(fileFullPath);
  //   await syncToS3MultipleRegions({
  //     fileBody: buffer,
  //     mimeType: "image/png",
  //     key: s3Key,
  //   });
  //   const response = new Response(buffer, {
  //     headers: {
  //       "Content-Type": "image/png",
  //       "Content-Length": buffer.length.toString(),
  //     },
  //   });
  //   return response;
  // }

  const result = await generateGPTImage({
    prompt,
    ratio: "square",
    promptHash,
    genLog: rootLogger,
  });

  const { getObjectUrl } = result;
  const imageResponse = await fetch(getObjectUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  // await fs.promises.writeFile(fileFullPath, Buffer.from(imageBuffer));

  await syncToS3MultipleRegions({
    fileBody: Buffer.from(imageBuffer),
    mimeType: "image/png",
    key: s3Key,
  });

  const response = new Response(Buffer.from(imageBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": imageBuffer.byteLength.toString(),
    },
  });
  return response;
}
