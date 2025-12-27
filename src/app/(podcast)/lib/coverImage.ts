import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { GeneratedFile, stepCountIs, streamText } from "ai";
import { createHash } from "crypto";
import { Locale } from "next-intl";

/**
 * Generate system prompt for podcast cover image generation
 */
const podcastCoverImageSystemPrompt = ({
  locale,
  englishOnly,
}: {
  locale: Locale;
  englishOnly: boolean;
}): string =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
你是一位专业的播客封面设计师，擅长创造视觉吸引力强的播客封面图。

【核心要求】
- 生成专业的播客节目封面图
- 适合播客平台分享（Apple Podcasts、Spotify、YouTube、小宇宙等）
- 主要内容居中，具有视觉冲击力
- 准确表达播客主题的核心价值
- 使用现代、简洁的设计风格
- 色彩搭配专业且吸引眼球
- 符合播客封面的特点：简洁、可识别、在小尺寸下依然清晰

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 方图（square）：四周均留出至少 10% 的安全边距
- 这样设计可以让图片在各种播客平台裁剪时仍然保持完整

${
  englishOnly
    ? `
【文字要求】
- 可以包含少量英文文字来强化主题
- 严格禁止：不要使用中文、日文、韩文等任何非英文文字
- 如果需要文字，只使用简洁的英文单词或短语
- 文字应该大而醒目，在缩略图中清晰可读
`
    : ""
}

【设计原则】
1. 清晰的视觉层次
2. 简洁而不简单
3. 突出播客主题
4. 符合播客平台的专业度
5. 易于在各种平台上识别
6. 在小尺寸缩略图中依然清晰可辨
`
    : `${promptSystemConfig({ locale })}
You are a professional podcast cover designer who excels at creating visually compelling podcast cover images.

【Core Requirements】
- Generate professional podcast cover images
- Suitable for podcast platform sharing (Apple Podcasts, Spotify, YouTube, Xiaoyuzhou, etc.)
- Main content centered with strong visual impact
- Accurately convey the core value of the podcast topic
- Use modern, clean design style
- Professional and eye-catching color schemes
- Meet podcast cover characteristics: simple, recognizable, clear at small sizes

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- Square images: Leave at least 10% safe margin on all sides
- This design ensures the image remains intact when cropped by various podcast platforms

${
  englishOnly
    ? `
【Text Requirements】
- May include minimal English text to reinforce the theme
- Strictly forbidden: Do NOT use Chinese, Japanese, Korean, or any non-English text
- If text is needed, use only concise English words or phrases
- Text should be large and prominent, clearly readable in thumbnails
`
    : ""
}

【Design Principles】
1. Clear visual hierarchy
2. Simple but not simplistic
3. Highlight podcast theme
4. Meet professional podcast platform standards
5. Easy to recognize across platforms
6. Clear and distinguishable in small thumbnail sizes
`;

/**
 * Generate user prompt for podcast cover image based on podcast script
 */
function podcastCoverImageProloguePrompt({
  locale,
  analyst,
  script,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "locale" | "topic" | "studyLog" | "brief">;
  script: string;
}): string {
  const { topic } = analyst;

  return locale === "zh-CN"
    ? `
请为以下播客节目生成一张专业的封面图：

【播客主题】
${topic}

【播客内容】
${script.substring(0, 3000)}...

请生成一张能够准确表达这个播客主题、适合播客平台分享的专业封面图，
主要内容必须居中，根据图片比例留出适当边距。
`
    : `
Please generate a professional cover image for the following podcast:

【Podcast Topic】
${topic}

【Podcast Content】
${script.substring(0, 3000)}...

Please generate a professional cover image that accurately represents this podcast topic and is suitable for podcast platform sharing,
main content must be centered with appropriate margins based on the image ratio.
`;
}

/**
 * Generate podcast cover image using Gemini image generation model
 * Falls back to Gemini 2.5 Flash if initial generation fails
 */
export async function generatePodcastCoverImage({
  ratio,
  analyst,
  podcast,
  script,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  ratio: "square" | "landscape" | "portrait";
  podcast: Pick<AnalystPodcast, "id" | "token">;
  analyst: Pick<Analyst, "id" | "locale" | "topic" | "studyLog" | "brief">;
  script: string;
} & AgentToolConfigArgs): Promise<{
  coverObjectUrl: string;
}> {
  const modelName: LLMModelName =
    locale === "zh-CN" ? "gemini-3-pro-image" : "gemini-2.5-flash-image";
  logger.info({ msg: "Starting podcast cover image generation", modelName });
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
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      temperature: 0,
      system: podcastCoverImageSystemPrompt({
        locale,
        englishOnly: modelName !== "gemini-3-pro-image",
      }),
      prompt: podcastCoverImageProloguePrompt({ locale, analyst, script }),
      abortSignal,
      stopWhen: stepCountIs(5),
      maxRetries: 3,
      onChunk: ({ chunk }) => {
        logger.debug({
          msg: "generatePodcastCoverImage streamText onChunk",
          chunk: chunk.type === "text-delta" ? chunk.text : chunk.type,
        });
      },
      onStepFinish: async (step) => {
        logger.info({
          msg: "generatePodcastCoverImage streamText onStepFinish",
          modelName,
          finishReason: step.finishReason,
          text: step.text,
          reasoning: step.reasoningText,
          files: step.files.length,
        });
      },
      onFinish: async ({ text, files, usage }) => {
        logger.info({
          msg: `generatePodcastCoverImage streamText onFinish`,
          modelName,
          text,
          usage,
        });
        if (files.length > 0 && statReport) {
          // 现在的 1k 配置下，一张图大概 0.3-1 元，使用固定 tokens
          const tokens = 10000 * files.length;
          await statReport("tokens", tokens, {
            reportedBy: "podcast cover image",
            analystId: analyst.id,
          });
        }
        resolve({ text, files });
      },
      onError: ({ error }) => {
        logger.info({
          msg: `generatePodcastCoverImage streamText onError: ${(error as Error).message}`,
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
    // Fallback to gemini 2.5 flash image if gemini-3-pro-image fails
    if (modelName === "gemini-3-pro-image") {
      logger.error({
        msg: "No image file generated, will retry with gemini 2.5 flash image",
        modelName,
      });
      return await generatePodcastCoverImage({
        ratio,
        analyst,
        podcast,
        script,
        locale: "en-US", // Use en-US to force gemini 2.5 flash image
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
  // Use image base64 as hash content
  const hash = createHash("sha256").update(imageFile.base64).digest("hex").substring(0, 40);
  const { objectUrl } = await uploadToS3({
    keySuffix: `imagegen/${hash}.png`,
    fileBody: imageFile.uint8Array,
    mimeType: imageFile.mediaType,
  });

  return {
    coverObjectUrl: objectUrl,
  };
}
