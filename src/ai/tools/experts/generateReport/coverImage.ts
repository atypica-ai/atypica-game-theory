import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { Analyst, AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { GeneratedFile, stepCountIs, streamText } from "ai";
import { createHash } from "crypto";
import { Locale } from "next-intl";

/**
 * Generate system prompt for cover image generation
 */
const coverImageSystemPrompt = ({
  locale,
  englishOnly,
}: {
  locale: Locale;
  englishOnly: boolean;
}): string =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
你是一位专业的研究报告封面设计师，擅长创造视觉吸引力强的封面图。

【核心要求】
- 生成专业的研究报告封面图
- 适合社交媒体分享（Twitter、LinkedIn、YouTube、Spotify、小宇宙等）
- 主要内容居中，具有视觉冲击力
- 准确表达研究主题的核心价值
- 使用现代、简洁的设计风格
- 色彩搭配专业且吸引眼球

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 这样设计可以让图片在各种社交媒体平台裁剪时仍然保持完整

${
  englishOnly
    ? `
【文字要求】
- 可以包含少量英文文字来强化主题
- 严格禁止：不要使用中文、日文、韩文等任何非英文文字
- 如果需要文字，只使用简洁的英文单词或短语
`
    : ""
}

【设计原则】
1. 清晰的视觉层次
2. 简洁而不简单
3. 突出研究主题
4. 符合商业报告专业度
5. 易于在各种平台上分享
`
    : `${promptSystemConfig({ locale })}
You are a professional research report cover designer who excels at creating visually compelling cover images.

【Core Requirements】
- Generate professional research report cover images
- Suitable for social media sharing (Twitter, LinkedIn, YouTube, Spotify, Xiaoyuzhou, etc.)
- Main content centered with strong visual impact
- Accurately convey the core value of the research topic
- Use modern, clean design style
- Professional and eye-catching color schemes

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- This design ensures the image remains intact when cropped by various social media platforms

${
  englishOnly
    ? `
【Text Requirements】
- May include minimal English text to reinforce the theme
- Strictly forbidden: Do NOT use Chinese, Japanese, Korean, or any non-English text
- If text is needed, use only concise English words or phrases
`
    : ""
}

【Design Principles】
1. Clear visual hierarchy
2. Simple but not simplistic
3. Highlight research theme
4. Meet professional business report standards
5. Easy to share across platforms
`;

/**
 * Generate user prompt for cover image based on research content
 */
function coverImageProloguePrompt({
  locale,
  analyst,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "locale" | "topic" | "studyLog" | "brief">;
}): string {
  const { topic, studyLog } = analyst;

  return locale === "zh-CN"
    ? `
请为以下商业研究生成一张专业的封面图：

【研究主题】
${topic}

${
  studyLog
    ? `
【研究详情】
${studyLog.substring(0, 2000)}...
`
    : ""
}

请生成一张能够准确表达这个研究主题、适合社交媒体分享的专业封面图，
主要内容必须居中，宽图左右留边、长图上下留边。
`
    : `
Please generate a professional cover image for the following business research:

【Study Topic】
${topic}

${
  studyLog
    ? `
【Study Details】
${studyLog.substring(0, 2000)}...
`
    : ""
}

Please generate a professional cover image that accurately represents this study topic and is suitable for social media sharing,
main content must be centered with margins (landscape: left/right, portrait: top/bottom).
`;
}

/**
 * Generate report cover image using Gemini 3 Pro Image model
 * Falls back to screenshot generation if image generation fails
 */
export async function generateReportCoverImage({
  ratio,
  analyst,
  report,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  ratio: "square" | "landscape" | "portrait";
  report: Pick<AnalystReport, "id" | "token">;
  analyst: Pick<Analyst, "id" | "locale" | "topic" | "studyLog" | "brief">;
} & AgentToolConfigArgs): Promise<{
  coverUrl: string;
}> {
  const modelName: LLMModelName =
    locale === "zh-CN" ? "gemini-3-pro-image" : "gemini-2.5-flash-image";
  logger.info({ msg: "Starting cover image generation", modelName });
  const promise = new Promise<{ text: string; files: GeneratedFile[] }>(async (resolve, reject) => {
    const response = streamText({
      model: llm(modelName),
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: ratio === "square" ? "1:1" : ratio === "landscape" ? "16:9" : "9:16",
            imageSize: "1K",
          },
          // thinkingConfig: {
          //   includeThoughts: true,
          //   thinkingLevel: "low",
          // },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      temperature: 0,
      system: coverImageSystemPrompt({ locale, englishOnly: modelName !== "gemini-3-pro-image" }),
      prompt: coverImageProloguePrompt({ locale, analyst }),
      abortSignal, // 5 minutes timeout
      stopWhen: stepCountIs(5),
      maxRetries: 3,
      onChunk: ({ chunk }) => {
        logger.debug({
          msg: "generateReportCoverImage streamText onChunk",
          chunk: chunk.type === "text-delta" ? chunk.text : chunk.type,
        });
      },
      onStepFinish: async (step) => {
        logger.info({
          msg: "generateReportCoverImage streamText onStepFinish",
          modelName,
          finishReason: step.finishReason,
          text: step.text,
          reasoning: step.reasoningText,
          files: step.files.length,
        });
      },
      onFinish: async ({ text, files, usage }) => {
        logger.info({
          msg: `generateReportCoverImage streamText onFinish`,
          modelName,
          text,
          usage,
        });
        if (files.length > 0 && statReport) {
          // const tokens = usage.totalTokens * 5;
          // 现在的 1k 配置下，ano banana 一张图大概 0.3 元，nano banana pro 一张图大概 1 元，使用固定 tokens
          const tokens = 10000 * files.length;
          await statReport("tokens", tokens, {
            reportedBy: "report cover image",
            analystId: analyst.id,
          });
        }
        resolve({ text, files });
      },
      onError: ({ error }) => {
        logger.info({
          msg: `generateReportCoverImage streamText onError: ${(error as Error).message}`,
          modelName,
        });
        reject(error);
      },
    });
    await response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const result = await promise;
  let imageFile = null;
  if (result.files && result.files.length > 0) {
    for (const file of result.files) {
      if (file.mediaType.startsWith("image/")) {
        imageFile = file;
        break;
      }
    }
  }
  if (!imageFile) {
    // ⚠️ TODO: 在 Nano banana 3 pro 稳定了以后，这个要拿掉
    if (modelName === "gemini-3-pro-image") {
      logger.error({
        msg: "No image file generated, will retry with gemini 2.5 flash image",
        modelName,
      });
      return await generateReportCoverImage({
        ratio,
        analyst,
        report,
        locale: "en-US", // 使用 en-US 强制使用 gemini 2.5 flash image
        abortSignal,
        statReport,
        logger,
      });
    } else {
      logger.error({ msg: "No image file generated", modelName });
      throw new Error("No image file generated");
    }
  }

  logger.info({ msg: "Image generated successfully", mediaType: imageFile.mediaType, modelName });
  // 使用图片 base64 作为 hash 内容
  const hash = createHash("sha256").update(imageFile.base64).digest("hex").substring(0, 40);
  const { getObjectUrl, objectUrl } = await uploadToS3({
    keySuffix: `imagegen/${hash}.png`,
    fileBody: imageFile.uint8Array,
    mimeType: imageFile.mediaType,
  });

  await mergeExtra({
    tableName: "AnalystReport",
    id: report.id,
    extra: {
      coverObjectUrl: objectUrl,
      // s3SignedCoverObjectUrl: null,
      // s3SignedCoverObjectUrlExpiresAt: null,
    } satisfies AnalystReportExtra,
  });

  // logger.info({ msg: "Cover image uploaded to S3", objectUrl });
  return {
    coverUrl: getObjectUrl,
  };
}
