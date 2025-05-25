import { imageModel } from "@/ai/provider";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { experimental_generateImage as generateImage } from "ai";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function GET(req: Request, { params }: { params: Promise<{ prompt: string }> }) {
  const referer = req.headers.get("referer") ?? "";
  const match = referer.match(/\/artifacts\/report\/(\w+)\//);
  if (!match) {
    return new Response("imagegen url is only available on report page", { status: 403 });
  }
  const reportToken = match[1];
  const report = await prisma.analystReport.findUniqueOrThrow({
    where: { token: reportToken },
    select: {
      analyst: {
        select: {
          id: true,
          userId: true,
          studyUserChat: { select: { id: true, token: true } },
        },
      },
    },
  });
  if (!report.analyst.studyUserChat) {
    rootLogger.error(`Failed to find studyUserChat for analyst ${report.analyst.id}`);
    return new Response("Something went wrong", { status: 500 });
  }
  const studyLog = rootLogger.child({
    studyUserChatId: report.analyst.studyUserChat.id,
    studyUserChatToken: report.analyst.studyUserChat.token,
  });
  const { statReport } = initStudyStatReporter({
    userId: report.analyst.userId,
    studyUserChatId: report.analyst.studyUserChat.id,
    studyLog,
  });

  const session = await getServerSession(authOptions);

  const { prompt } = await params;
  const url = new URL(req.url);
  let ratio = url.searchParams.get("ratio") as "square" | "landscape" | "portrait" | undefined;
  try {
    ratio = z.enum(["square", "landscape", "portrait"]).default("square").parse(ratio);
  } catch {
    ratio = "square";
  }
  const genLog = studyLog.child({
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

  if (!session?.user || report.analyst.userId !== session.user.id) {
    // 如果图片还没生成，只有用户自己可以访问，因为要消耗 token
    return new Response("Unauthorized", { status: 401 });
  }

  // 立即先插入记录
  const { id } = await prisma.imageGeneration.create({
    data: {
      prompt,
      promptHash,
      objectUrl: "",
      extra: { ratio, reportToken },
    },
  });

  const backgroundGeneration = new Promise<string>(async (resolve, reject) => {
    try {
      // Generate the image
      const { image } = await generateImage({
        model: imageModel("imagen-4.0-ultra"),
        aspectRatio: ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16",
        // model: imageModel("gpt-image-1"),
        // size: ratio === "square" ? "1024x1024" : ratio === "landscape" ? "1536x1024" : "1024x1536",
        prompt,
        // abortSignal: req.signal, // 后台运行，不 abort
      });
      // 图像生成一张固定消耗 10000 tokens
      await statReport("tokens", 10000, {
        reportedBy: "image generation",
        imageGenerationId: id,
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
