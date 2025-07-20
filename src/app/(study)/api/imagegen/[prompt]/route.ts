import { imageGenerationObjectUrlToHttpUrl } from "@/app/(study)/artifacts/lib/imagegen";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { ImageGeneration } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createHash } from "crypto";
import { z } from "zod";

async function optimizedImageUrl(imageGeneration: ImageGeneration) {
  const url = await imageGenerationObjectUrlToHttpUrl(imageGeneration);
  const siteOrigin = await getRequestOrigin();
  if (getDeployRegion() === "mainland" && !/amazonaws\.com\.cn/.test(url)) {
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return `${siteOrigin}/_next/image?url=${encodeURIComponent(proxiedUrl)}&w=1920&q=100`;
  } else {
    return `${siteOrigin}/_next/image?url=${encodeURIComponent(url)}&w=1920&q=100`;
  }
}

const ratioSchema = z.enum(["square", "landscape", "portrait"]).default("square");

export async function GET(req: Request, { params }: { params: Promise<{ prompt: string }> }) {
  const { prompt } = await params;
  const url = new URL(req.url);
  let ratio = url.searchParams.get("ratio") as z.infer<typeof ratioSchema> | undefined;
  try {
    ratio = ratioSchema.parse(ratio);
  } catch {
    ratio = "square";
  }

  const promptHash = createHash("sha256")
    .update(JSON.stringify({ prompt, ratio }))
    .digest("hex")
    .substring(0, 40);

  const existingImage = await prisma.imageGeneration.findUnique({
    where: { promptHash },
  });
  if (!existingImage) {
    return new Response("Image not found", { status: 404 });
  }

  if (existingImage.generatedAt) {
    return Response.redirect(await optimizedImageUrl(existingImage), 302);
  }
  if (
    Date.now() - existingImage.createdAt.getTime() >
    10 * 60 * 1000 // 超过十分钟算超时
  ) {
    return Response.json({ error: "image generation timeout" }, { status: 408 });
  }

  const { id } = existingImage;
  const genLog = rootLogger.child({ promptHash, imageGenerationId: id });
  try {
    const getObjectUrl = await new Promise<string>(async (resolve, reject) => {
      req.signal.addEventListener("abort", () => {
        reject(null);
      });
      const startTime = Date.now();
      let elapsedSeconds = 0;
      const checkImage = async () => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        if (elapsedSeconds > 60 * 3) {
          reject(new Error("timeout"));
          return;
        }
        const updatedImage = await prisma.imageGeneration.findUniqueOrThrow({ where: { id } });
        if (updatedImage.generatedAt) {
          resolve(await optimizedImageUrl(updatedImage));
          return;
        } else {
          setTimeout(checkImage, 5000);
        }
      };
      setTimeout(checkImage, 0); // 立即开始检查
    });
    return Response.redirect(getObjectUrl, 302);
  } catch (error) {
    if (error) {
      genLog.error(`Error checking image status: ${(error as Error).message}`);
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
