import { imageModel } from "@/ai/provider";
import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { experimental_generateImage as generateImage } from "ai";
import { createHash } from "crypto";
import { z } from "zod";

export async function GET(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  req: Request,
  { params }: { params: Promise<{ prompt: string }> },
) {
  const { prompt } = await params;
  const url = new URL(req.url);
  let ratio = url.searchParams.get("ratio") as `${number}:${number}` | undefined;
  try {
    ratio = z.enum(["1:1", "4:3", "16:9"]).default("1:1").parse(ratio);
  } catch {
    ratio = "1:1";
  }
  const genLog = rootLogger.child({
    prompt: prompt.substring(0, 20),
    ratio,
  });

  // Generate hash for the prompt
  const promptHash = createHash("sha256")
    .update(JSON.stringify({ prompt, ratio }))
    .digest("hex")
    .substring(0, 40);

  // Check if image already exists in database
  const existingImage = await prisma.imageGeneration.findUnique({
    where: { promptHash },
  });

  if (existingImage) {
    const { id } = existingImage;
    try {
      const getObjectUrl = await new Promise<string>(async (resolve, reject) => {
        const startTime = Date.now();
        let elapsedSeconds = 0;
        const checkImage = async () => {
          elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          if (elapsedSeconds > 60) {
            reject(new Error("imagegen timeout"));
          }
          genLog.info(`imagegen ongoing, ${elapsedSeconds} seconds`);
          const updatedImage = await prisma.imageGeneration.findUniqueOrThrow({ where: { id } });
          if (updatedImage.generatedAt) {
            genLog.info(`imagegen completed, ${elapsedSeconds} seconds`);
            resolve(await s3SignedUrl(updatedImage.objectUrl));
          } else {
            setTimeout(checkImage, 5000);
          }
        };
        setTimeout(checkImage, 0); // 立即开始检查
      });
      return Response.redirect(getObjectUrl, 302);
    } catch (error) {
      genLog.error(`Error checking image status: ${(error as Error).message}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 立即先插入记录
  const { id } = await prisma.imageGeneration.create({
    data: {
      prompt,
      promptHash,
      objectUrl: "",
      extra: { ratio },
    },
  });

  const backgroundGeneration = new Promise<string>(async (resolve, reject) => {
    try {
      // Generate the image
      const { image } = await generateImage({
        model: imageModel("imagen-4.0-ultra"),
        prompt,
        aspectRatio: ratio,
        // abortSignal: req.signal, // 后台运行，不 abort
      });
      const { getObjectUrl, objectUrl } = await uploadToS3({
        keySuffix: `imagegen/${promptHash}.png`,
        fileBody: image.uint8Array,
        mimeType: image.mimeType,
      });
      await prisma.imageGeneration.update({
        where: { id },
        data: {
          objectUrl,
          generatedAt: new Date(),
        },
      });
      resolve(getObjectUrl);
    } catch (error) {
      reject(error);
    }
  });

  waitUntil(backgroundGeneration);

  const getObjectUrl = await backgroundGeneration;

  return Response.redirect(getObjectUrl, 302);
}
