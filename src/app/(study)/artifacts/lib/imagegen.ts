import "server-only";

import { imageModel } from "@/ai/provider";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { uploadToS3 } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { experimental_generateImage as generateImage } from "ai";
import { createHash } from "crypto";
import { Logger } from "pino";
import { z } from "zod";

/**
 * 在 reportGenerationTool 的 throttleSaveHTML 方法里调用
 */
export async function triggerImagegenInReport(html: string, reportToken: string) {
  const imgTagRegex = /<img([^>]*?)src="(\/api\/imagegen\/[^"]*)"([^>]*?)>/g;
  const matches = [...html.matchAll(imgTagRegex)];
  const siteOrigin = await getRequestOrigin();
  const promises = Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matches.map(([match, beforeSrc, src, afterSrc], index) => {
      // Extract prompt and ratio from the URL
      const urlParts = src.split("/");
      const prompt = urlParts[urlParts.length - 1].split("?")[0];
      const urlObj = new URL(src, siteOrigin);
      const ratio = urlObj.searchParams.get("ratio") || "";
      return backgroundGenerateImage({ prompt, ratio, reportToken });
    }),
  );
  try {
    await promises;
  } catch (error) {
    rootLogger.error(
      `Error in triggerImageGeneration for report ${reportToken}: ${(error as Error).message}`,
    );
  }
}

const ratioSchema = z.enum(["square", "landscape", "portrait"]).default("square");

async function backgroundGenerateImage({
  prompt,
  ratio: _ratio,
  reportToken,
}: {
  prompt: string;
  ratio: string;
  reportToken: string;
}) {
  let ratio: z.infer<typeof ratioSchema>;
  try {
    ratio = ratioSchema.parse(_ratio);
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
  // 如果已经调用过 post，直接返回，啥也不干
  if (existingImage) {
    return;
  }

  if (!reportToken) {
    return new Response("reportToken is required to generate image", { status: 400 });
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

  // 图片没有生成过，需要检查必要的权限，有权限以后可以接下来插入数据库条目
  // update: 现在是 triggerImageGeneration 方法在调用，所以无需校验用户了
  // const session = await getServerSession(authOptions);
  // if (!session?.user || report.analyst.userId !== session.user.id) {
  //   // 如果图片还没生成，只有用户自己可以访问，因为要消耗 token
  //   return new Response("Unauthorized", { status: 401 });
  // }

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
  const genLog = rootLogger.child({ promptHash, imageGenerationId: id });
  const { statReport } = initStudyStatReporter({
    userId: report.analyst.userId,
    studyUserChatId: report.analyst.studyUserChat.id,
    studyLog,
  });

  // const abortSignal = req.signal;
  const backgroundGeneration = new Promise<string>(async (resolve, reject) => {
    let result: { getObjectUrl: string; objectUrl: string; urls?: string[] };
    try {
      // result = await generateMidjourney({ prompt, ratio, promptHash, genLog });
      result = await generateGPTImage({ prompt, ratio, promptHash, genLog });
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes("No image generated")) {
        // 一个还不知道什么原因的 imagen-4.0-ultra 的错误
        genLog.warn(`generateGPTImage error: ${errorMsg}, fallback to generateMidjourney`);
        result = await generateMidjourney({ prompt, ratio, promptHash, genLog });
      } else {
        await prisma.imageGeneration.update({
          where: { id },
          data: { extra: { ...recordExtra, error: errorMsg } },
        });
        reject(error);
        return;
      }
    }
    const { getObjectUrl, objectUrl, urls } = result;
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
        extra: urls ? { ...recordExtra, midjourney: { urls } } : { ...recordExtra },
      },
    });
    resolve(getObjectUrl);
  });

  waitUntil(backgroundGeneration);
  // 不返回 promise，立即 resolve，调用者可以继续，imagegen 在后台运行，直到结束
}

export async function generateMidjourney({
  prompt,
  ratio,
  promptHash,
  genLog,
  // abortSignal,
}: {
  prompt: string;
  ratio: "square" | "landscape" | "portrait";
  promptHash: string;
  genLog: Logger;
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
  genLog.info(`Midjourney job ID: ${jobId}`);

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
      genLog.info(`Midjourney job ID: ${jobId}, status ${data.status}, ${elapsedSeconds} seconds`);
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
export async function generateGPTImage({
  prompt,
  ratio,
  promptHash,
  genLog,
}: {
  prompt: string;
  ratio: "square" | "landscape" | "portrait";
  promptHash: string;
  genLog: Logger;
  abortSignal?: AbortSignal;
}) {
  const { image } = await new Promise<Awaited<ReturnType<typeof generateImage>>>(
    async (resolve, reject) => {
      let stop = false;
      generateImage({
        model: imageModel("imagen-4.0-ultra"),
        aspectRatio: ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16",
        // model: imageModel("gpt-image-1"),
        // size: ratio === "square" ? "1024x1024" : ratio === "landscape" ? "1536x1024" : "1024x1536",
        prompt,
        // abortSignal: req.signal, // 后台运行，不 abort
        abortSignal: AbortSignal.timeout(300 * 1000),
      })
        .then((res) => resolve(res))
        .catch((error) => reject(error))
        .finally(() => {
          stop = true;
        });
      const startTime = Date.now();
      let elapsedSeconds = 0;
      const checkJob = async () => {
        if (stop) return;
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        // 加了 abortSignal，说一其实不需要这里的判断了
        // if (elapsedSeconds > 300) {
        //   reject(new Error("generateGPTImage request timeout"));
        //   return;
        // }
        genLog.info(`generateGPTImage ${promptHash}, ${elapsedSeconds} seconds`);
        setTimeout(checkJob, 5000);
      };
      setTimeout(checkJob, 0);
    },
  );
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `imagegen/${promptHash}.png`,
    fileBody: image.uint8Array,
    mimeType: image.mimeType,
  });
  return { getObjectUrl, objectUrl };
}
