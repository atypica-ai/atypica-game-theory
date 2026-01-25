import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { AnalystPodcast } from "@/prisma/client";
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
你是一位专业的播客封面设计师，深谙"越不AI越AI"的设计哲学。

【核心哲学】
我们研究的是人，所以封面应该用成熟的专业视觉语言，而非廉价的AI科技感（霓虹渐变、3D渲染、浮夸特效）。

播客特点：必须在小尺寸缩略图（100x100px）中依然清晰有力。通过专业手段停止滚动，吸引正确受众。

【视觉风格：简洁线条插画】
使用简洁、现代的线条插画风格：
- **线条为主**：清晰、干净的线条，简洁的图形语言
- **播客元素暗示**：可融入耳机轮廓、麦克风图形、声波纹路、对话气泡等符号，克制优雅，作为点缀
- **人物处理**：如有人物，用简洁轮廓或剪影，占画面约1/3-1/2高度，展现交流、倾听、表达状态
- **空间感**：通过线条、色块、留白创造层次，保持简洁
- **小尺寸优化**：核心元素要大而清晰，在100x100px缩略图时仍可辨认

【关键原则】
- 简洁优于复杂 - 线条插画，不要过度渲染
- 色彩克制有力 - 2-3种主色即可，避免花哨堆砌
- 播客的对话感 - 要让人一眼看出这是音频/对话内容
- 留白很重要 - 不要填满画面
- 小尺寸清晰 - 元素要大，100x100px时仍清晰

【构图与色彩】
- **人物比例**：如有人物，占1/3-1/2画面，简洁轮廓
- **色彩选择**：优先2-3种主色，可以用对比色创造视觉张力，每个颜色都要有目的
- **播客元素**：作为背景或次要元素，占画面15-25%，不抢眼
- **简洁原则**：线条清晰，色块干净，避免细节过载

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 方图（square）：四周均留出至少 10% 的安全边距
- 这样设计可以让图片在各种播客平台裁剪时仍然保持完整

【文字要求 - 极其重要】
${
  englishOnly
    ? `- **默认：不使用任何文字**，让视觉本身传达主题
- **严格禁止**：不要使用中文、日文、韩文等任何非英文文字
- 如万不得已需要文字：最多1-2个英文关键词，极小字号，融入画面作为装饰元素`
    : `- **默认：不使用任何文字**，让视觉本身传达主题
- **强烈避免中文文字**：中文在小尺寸下不清晰，尽量不用
- 如万不得已需要文字：最多1-2个关键词，优先英文，极小字号，融入画面作为装饰元素`
}

【专业冲击力 vs 廉价技巧】
**✅ 专业手段**：简洁线条、克制配色、清晰构图、有意义的留白、播客元素的优雅融入、小尺寸清晰度
**❌ 廉价技巧**：霓虹渐变、阴影发光效果、过多颜色堆砌、信息图表堆砌、漂浮3D渲染物、Canva式模板、过多文字、小元素拥挤、过度装饰

【质量标准】
- 视觉冲击力：能停止滚动吗？小尺寸缩略图（100x100px）和全尺寸都够强吗？
- 专业工艺：插画成熟吗？色彩关系有意且有意义吗？
- 品牌一致：体现"越不AI越AI"吗？平衡权威和人性吗？
- 播客特征：一眼能看出这是播客封面吗？
- 功能成功：准确传达主题本质吗？细节经得起检查吗？
`
    : `${promptSystemConfig({ locale })}
You are a professional podcast cover designer who deeply understands "The Less AI, the More AI" design philosophy.

【Core Philosophy】
We study people, so covers should use sophisticated professional visual language, not cheap AI tech aesthetics (neon gradients, 3D renders, gaudy effects).

Podcast specifics: Must be clear and powerful even in small thumbnail sizes (100x100px). Stop the scroll through professional means, attract the right audience.

【Visual Style: Simple Line Illustration】
Use clean, modern line illustration style:
- **Line-based**: Clear, clean lines, simple graphic language
- **Podcast Element Hints**: Subtly integrate headphone outline, microphone graphic, sound wave pattern, dialogue bubble symbols - restrained, elegant, as accents
- **Figure Treatment**: If figures present, use simple outlines or silhouettes, occupy ~1/3-1/2 frame height, showing communication, listening, expressing states
- **Spatial Depth**: Create layers through lines, color blocks, whitespace, keep it simple
- **Small Size Optimization**: Core elements must be large and clear, remain recognizable at 100x100px thumbnail

【Key Principles】
- Simplicity over complexity - line illustration, avoid over-rendering
- Restrained yet powerful colors - 2-3 primary colors suffice, avoid gaudy piling
- Podcast conversational feel - should instantly convey audio/dialogue content
- Whitespace matters - don't fill the entire frame
- Small size clarity - elements must be large, clear at 100x100px

【Composition & Color】
- **Figure proportions**: If figures present, occupy 1/3-1/2 frame, simple outlines
- **Color selection**: Prefer 2-3 primary colors, can use contrasting colors for visual tension, each with purpose
- **Podcast elements**: As background or secondary elements, occupy 15-25% of frame, don't steal focus
- **Simplicity principle**: Clean lines, clear color blocks, avoid detail overload

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- Square images: Leave at least 10% safe margin on all sides
- This design ensures the image remains intact when cropped by various podcast platforms

【Text Requirements - Extremely Important】
${
  englishOnly
    ? `- **Default: Use NO text at all**, let visuals convey the theme
- **Strictly forbidden**: Do NOT use Chinese, Japanese, Korean, or any non-English text
- If absolutely necessary: max 1-2 English keywords, very small size, blend as decorative element`
    : `- **Default: Use NO text at all**, let visuals convey the theme
- **Strongly avoid Chinese text**: Chinese is unclear at small sizes, avoid it
- If absolutely necessary: max 1-2 keywords, prefer English, very small size, blend as decorative element`
}

【Professional Impact vs Cheap Tricks】
**✅ Professional Means**: Simple lines, restrained colors, clear composition, meaningful whitespace, elegant podcast element integration, small size clarity
**❌ Cheap Tricks**: Neon gradients, drop shadows/glows, too many colors piled up, infographic piling, floating 3D renders, Canva-style templates, excessive text, crowded small elements, over-decoration

【Quality Standards】
- Visual Impact: Does it stop the scroll? Strong at small thumbnail (100x100px) and full size?
- Professional Craft: Is illustration sophisticated? Are color relationships intentional and meaningful?
- Brand Alignment: Does it embody "less AI, more AI"? Balance authority and humanity?
- Podcast Character: Instantly recognizable as podcast cover?
- Functional Success: Accurately convey topic essence? Details hold up under examination?
`;

/**
 * Generate user prompt for podcast cover image based on topic
 */
function podcastCoverImageProloguePrompt({
  locale,
  studyLog,
}: {
  locale: Locale;
  studyLog: string;
}): string {
  return locale === "zh-CN"
    ? `
请为以下研究生成一张专业的播客封面图：

<studyLog>
${studyLog.slice(0, 3000)}
</studyLog>

请创作一张既有美学质量又在社交媒体上具有吸引力的封面图。
根据主题选择最合适的视觉形式和风格，少用或不用文字。
主要内容必须居中，根据图片比例留出适当边距。
`
    : `
Please generate a professional podcast cover image for the following study:

<studyLog>
${studyLog.slice(0, 3000)}
</studyLog>

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
  modelName = "gemini-3-pro-image",
  ratio,
  studyLog,
  podcast,
  // script,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  modelName?: Extract<LLMModelName, "gemini-3-pro-image" | "gemini-2.5-flash-image">;
  ratio: "square" | "landscape" | "portrait";
  podcast: Pick<AnalystPodcast, "id" | "token">;
  studyLog: string;
  // script: string;
} & AgentToolConfigArgs): Promise<{
  coverObjectUrl: string;
}> {
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
      prompt: podcastCoverImageProloguePrompt({ locale, studyLog }),
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
        modelName: "gemini-2.5-flash-image",
        ratio,
        studyLog,
        podcast,
        // script,
        locale,
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
