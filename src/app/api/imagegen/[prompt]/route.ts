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
  if (existingImage) {
    if (existingImage.generatedAt) {
      return Response.redirect(await s3SignedUrl(existingImage.objectUrl), 302);
    } else if (
      Date.now() - existingImage.createdAt.getTime() >
      10 * 60 * 1000 // 超过十分钟算超时
    ) {
      return Response.json({ error: "image generation timeout" }, { status: 408 });
    }
  }

  // 以上部分，不需要检测 reportToken 和 user

  const reportToken = url.searchParams.get("reportToken");
  if (!reportToken) {
    return new Response("imagegen url is only available on report page", { status: 403 });
  }
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
  const genLog = studyLog.child({
    prompt: prompt.substring(0, 20),
    ratio,
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
            return;
          }
          genLog.info(`imagegen ongoing, ${elapsedSeconds} seconds`);
          const updatedImage = await prisma.imageGeneration.findUniqueOrThrow({ where: { id } });
          if (updatedImage.generatedAt) {
            genLog.info(`imagegen completed, ${elapsedSeconds} seconds`);
            resolve(await s3SignedUrl(updatedImage.objectUrl));
            return;
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

  // 图片没有生成过，需要检查必要的权限，有权限以后可以接下来插入数据库条目

  const session = await getServerSession(authOptions);
  if (!session?.user || report.analyst.userId !== session.user.id) {
    // 如果图片还没生成，只有用户自己可以访问，因为要消耗 token
    return new Response("Unauthorized", { status: 401 });
  }

  // 立即先插入记录
  const recordExtra = { ratio, reportToken };
  const { id } = await prisma.imageGeneration.create({
    data: {
      prompt,
      promptHash,
      objectUrl: "",
      extra: { ...recordExtra },
    },
  });

  const { statReport } = initStudyStatReporter({
    userId: report.analyst.userId,
    studyUserChatId: report.analyst.studyUserChat.id,
    studyLog,
  });

  const backgroundGeneration = new Promise<string>(async (resolve, reject) => {
    try {
      const { getObjectUrl, objectUrl, urls } = await generateMidjourney({
        prompt,
        ratio,
        promptHash,
        // abortSignal: req.signal,
      });
      // 图像生成一张固定消耗 10000 tokens
      await statReport("tokens", 10000, {
        reportedBy: "image generation",
        imageGenerationId: id,
      });
      await prisma.imageGeneration.update({
        where: { id },
        data: {
          objectUrl,
          generatedAt: new Date(),
          extra: {
            ...recordExtra,
            midjourney: { urls },
          },
        },
      });
      resolve(getObjectUrl);
    } catch (error) {
      await prisma.imageGeneration.update({
        where: { id },
        data: {
          extra: { ...recordExtra, error: (error as Error).message },
        },
      });
      reject(error);
    }
  });

  waitUntil(backgroundGeneration);

  try {
    const getObjectUrl = await backgroundGeneration;
    return Response.redirect(getObjectUrl, 302);
  } catch (error) {
    genLog.error(`Image generation failed with error: ${(error as Error).message}`);
    return new Response("Image generation failed", { status: 500 });
  }
}

async function generateMidjourney({
  prompt,
  ratio,
  promptHash,
  // abortSignal,
}: {
  prompt: string;
  ratio: "square" | "landscape" | "portrait";
  promptHash: string;
  abortSignal?: AbortSignal;
}) {
  const headers = {
    "x-youchuan-app": process.env.YOUCHUAN_APP_ID!,
    "x-youchuan-secret": process.env.YOUCHUAN_SECRET!,
  };
  const responseJson = async (response: Response) => {
    if (response.status !== 200) {
      throw new Error(
        `Midjourney API request failed with status ${response.status}: ${await response.text()}`,
      );
    }
    return await response.json();
  };
  const response = await fetch("https://ali.youchuan.cn/v1/tob/diffusion", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      callback: "",
      text: `${prompt} --v 7 --ar ${ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16"}`,
    }),
  });

  const { id: jobId } = await responseJson(response);
  console.log(`Midjourney job ID: ${jobId}`);

  const urls = await new Promise<string[]>(async (resolve, reject) => {
    const startTime = Date.now();
    let elapsedSeconds = 0;
    const checkJob = async () => {
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      if (elapsedSeconds > 300) {
        reject(new Error("Midjourney API request timeout"));
        return;
      }
      const response = await fetch(`https://ali.youchuan.cn/v1/tob/job/${jobId}`, {
        method: "GET",
        headers: { ...headers },
      });
      let data;
      try {
        data = await responseJson(response);
      } catch (error) {
        reject(error);
        return;
      }
      console.log(`Midjourney job ID: ${jobId}, status ${data.status}, ${elapsedSeconds} seconds`);
      if (+data.status === 3) {
        reject(new Error(`Midjourney API request failed: ${JSON.stringify(data)}`));
      } else if (+data.status === 2) {
        resolve(data.urls);
      } else {
        setTimeout(checkJob, 5000);
      }
    };
    setTimeout(checkJob, 0);
  });

  const imageUrl = urls[0];
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `imagegen/${promptHash}.png`,
    fileBody: new Uint8Array(imageBuffer),
    mimeType: imageResponse.headers.get("content-type") || "image/png",
  });

  return { getObjectUrl, objectUrl, urls };
}

/**
 * gemini 总是出现 Error [AI_NoImageGeneratedError]: No image generated.，可用性还需要多测试
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateGPTImage({
  prompt,
  ratio,
  promptHash,
}: {
  prompt: string;
  ratio: "square" | "landscape" | "portrait";
  promptHash: string;
  abortSignal?: AbortSignal;
}) {
  const { image } = await generateImage({
    model: imageModel("imagen-4.0-ultra"),
    aspectRatio: ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16",
    // model: imageModel("gpt-image-1"),
    // size: ratio === "square" ? "1024x1024" : ratio === "landscape" ? "1536x1024" : "1024x1536",
    prompt,
    // abortSignal: req.signal, // 后台运行，不 abort
  });
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `imagegen/${promptHash}.png`,
    fileBody: image.uint8Array,
    mimeType: image.mimeType,
  });
  return { getObjectUrl, objectUrl };
}
