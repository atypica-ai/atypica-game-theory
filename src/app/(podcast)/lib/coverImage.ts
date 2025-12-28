import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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
你是一位专业的播客封面设计师，擅长创造具有美学品味和社交媒体吸引力的播客封面图。

【核心要求】
- 生成专业且具有美学质量的播客节目封面图
- 适合播客平台分享（Apple Podcasts、Spotify、YouTube、小宇宙等）
- 主要内容居中，准确传达播客主题的本质
- 在社交媒体上具有吸引力，能引起用户点击和分享的兴趣
- 符合播客封面的特点：简洁、可识别、在小尺寸下依然清晰

【美学原则】
- 追求美学质量和视觉品味，而非套用固定风格
- 可以是摄影、设计、插画、概念艺术等任何形式
- 可以专业严肃，也可以活泼轻松，根据主题选择合适的表达方式
- 配色可以柔和低调，也可以鲜明有力，关键是有品味、有美感
- 构图要有张力和美感，同时保持清晰度

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 方图（square）：四周均留出至少 10% 的安全边距
- 这样设计可以让图片在各种播客平台裁剪时仍然保持完整

【文字要求】
- 尽量少用或不用文字，让视觉本身传达主题
- 如果确实需要文字辅助，最多使用 1-3 个关键词
- 文字应该融入画面，而非占据主导
${
  englishOnly
    ? `- 严格禁止：不要使用中文、日文、韩文等任何非英文文字
- 如果需要文字，只使用简洁的英文单词或短语`
    : ""
}

【禁止项】
- ❌ 不要使用廉价的信息图表式堆砌（图标+几何图形的模板化设计）
- ❌ 不要使用过度合成、缺乏质感的元素
- ❌ 不要使用陈词滥调的商业模板风格
- ❌ 避免低质量、粗糙的视觉效果

【设计原则】
1. 美学质量优先，追求视觉品味
2. 根据主题选择最合适的表达形式（摄影、设计、插画等）
3. 既有美学深度，又有社交媒体吸引力
4. 构图有张力和呼吸感
5. 在小尺寸缩略图中依然清晰有力
`
    : `${promptSystemConfig({ locale })}
You are a professional podcast cover designer who excels at creating podcast cover images with aesthetic taste and social media appeal.

【Core Requirements】
- Generate professional podcast cover images with high aesthetic quality
- Suitable for podcast platform sharing (Apple Podcasts, Spotify, YouTube, Xiaoyuzhou, etc.)
- Main content centered, accurately conveying the essence of the podcast topic
- Attractive on social media, sparking user interest to click and share
- Meet podcast cover characteristics: simple, recognizable, clear at small sizes

【Aesthetic Principles】
- Pursue aesthetic quality and visual taste, not fixed formulas
- Can be photography, design, illustration, conceptual art, or any form
- Can be professional and serious, or lively and playful, depending on the topic
- Color palette can be muted and subtle, or bold and vibrant—key is taste and beauty
- Composition should have tension and beauty while maintaining clarity

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- Square images: Leave at least 10% safe margin on all sides
- This design ensures the image remains intact when cropped by various podcast platforms

【Text Requirements】
- Use minimal or no text, let the visuals themselves convey the theme
- If text is truly needed, use at most 1-3 keywords
- Text should blend into the composition, not dominate it
${
  englishOnly
    ? `- Strictly forbidden: Do NOT use Chinese, Japanese, Korean, or any non-English text
- If text is needed, use only concise English words or phrases`
    : ""
}

【Prohibitions】
- ❌ No cheap infographic-style stacking (templated designs with icons + geometric shapes)
- ❌ No overly synthetic elements lacking texture
- ❌ No clichéd business template styles
- ❌ Avoid low-quality, crude visual effects

【Design Principles】
1. Aesthetic quality first, pursue visual taste
2. Choose the most appropriate form for the topic (photography, design, illustration, etc.)
3. Balance aesthetic depth with social media appeal
4. Composition with tension and breathing space
5. Clear and powerful even in small thumbnail sizes
`;

/**
 * Generate user prompt for podcast cover image based on topic
 */
function podcastCoverImageProloguePrompt({
  locale,
  analyst,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "locale" | "topic" | "studyLog" | "brief">;
}): string {
  const { topic } = analyst;

  return locale === "zh-CN"
    ? `
请为以下主题生成一张专业的播客封面图：

【主题】
${topic}

请创作一张既有美学质量又在社交媒体上具有吸引力的封面图。
根据主题选择最合适的视觉形式和风格，少用或不用文字。
主要内容必须居中，根据图片比例留出适当边距。
`
    : `
Please generate a professional podcast cover image for the following topic:

【Topic】
${topic}

Create a cover image with both aesthetic quality and social media appeal.
Choose the most appropriate visual form and style based on the topic, minimal or no text.
Main content must be centered with appropriate margins based on the image ratio.
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
      prompt: podcastCoverImageProloguePrompt({ locale, analyst }),
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

  // Update nested metadata.coverObjectUrl using raw SQL
  await prisma.$executeRaw`
    UPDATE "AnalystPodcast"
    SET "extra" = jsonb_set(
          COALESCE("extra", '{}')::jsonb,
          '{metadata,coverObjectUrl}',
          to_jsonb(${objectUrl}::text),
          true
        ),
        "updatedAt" = NOW()
    WHERE "id" = ${podcast.id}
  `;

  // Note: Can't use mergeExtra directly because coverObjectUrl is nested in metadata
  // await mergeExtra({
  //   tableName: "AnalystPodcast",
  //   id: podcast.id,
  //   extra: {
  //     metadata: {
  //       coverObjectUrl: objectUrl,
  //     },
  //   } satisfies AnalystPodcastExtra,
  // });

  return {
    coverObjectUrl: objectUrl,
  };
}
