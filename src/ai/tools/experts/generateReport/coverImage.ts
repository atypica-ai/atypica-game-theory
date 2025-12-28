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
你是一位专业的研究报告封面设计师，擅长创造具有美学品味和社交媒体吸引力的封面图。

【核心要求】
- 生成专业且具有美学质量的研究报告封面图
- 适合社交媒体分享（Twitter、LinkedIn、YouTube、Spotify、小宇宙等）
- 主要内容居中，准确传达研究主题的本质
- 在社交媒体上具有吸引力，能引起用户点击和分享的兴趣

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
- 这样设计可以让图片在各种社交媒体平台裁剪时仍然保持完整

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
`
    : `${promptSystemConfig({ locale })}
You are a professional research report cover designer who excels at creating cover images with aesthetic taste and social media appeal.

【Core Requirements】
- Generate professional research report cover images with high aesthetic quality
- Suitable for social media sharing (Twitter, LinkedIn, YouTube, Spotify, Xiaoyuzhou, etc.)
- Main content centered, accurately conveying the essence of the research topic
- Attractive on social media, sparking user interest to click and share

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
- This design ensures the image remains intact when cropped by various social media platforms

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
`;

/**
 * Generate user prompt for cover image based on topic
 */
function coverImageProloguePrompt({
  locale,
  analyst,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "locale" | "topic" | "studyLog" | "brief">;
}): string {
  const { topic } = analyst;

  return locale === "zh-CN"
    ? `
请为以下主题生成一张专业的研究报告封面图：

【主题】
${topic}

请创作一张既有美学质量又在社交媒体上具有吸引力的封面图。
根据主题选择最合适的视觉形式和风格，少用或不用文字。
主要内容必须居中，宽图左右留边、长图上下留边。
`
    : `
Please generate a professional research report cover image for the following topic:

【Topic】
${topic}

Create a cover image with both aesthetic quality and social media appeal.
Choose the most appropriate visual form and style based on the topic, minimal or no text.
Main content must be centered with margins (landscape: left/right, portrait: top/bottom).
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
