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
你是一位专业的播客封面设计师，深谙"越不AI越AI"的设计哲学。

【核心哲学】
我们研究的是人，所以封面应该用成熟的专业视觉语言（电影摄影、建筑摄影、编辑设计），而非廉价的AI科技感（霓虹渐变、3D渲染、浮夸特效）。

播客特点：必须在小尺寸缩略图中依然清晰有力。通过专业手段停止滚动，吸引正确受众。

【视觉语言选择】根据主题选择合适的专业手法：
- **电影摄影** - 消费者洞察、情感内容：戏剧性打光、强烈色彩对比、环境中的人的存在
- **建筑摄影** - 战略分析、系统思考：几何构图、光影戏剧、纪念性尺度
- **纪实摄影** - 真实消费者时刻、田野研究：自然光、真实环境、诚实时刻
- **编辑设计** - 专业文档、理性分析：成熟排版、克制色彩、精心构图

【关键原则】
- 真实大于合成，但要有戏剧性 - 摄影优于CGI渲染
- 力量和深度 - 既停止滚动，又经得起细看
- 色彩作为戏剧，不是装饰 - 电影化色彩对比（琥珀vs钴蓝）而非随机彩虹渐变
- 人作为主体 - 如有人物，应占有意义空间（约1/3画面高度）

【构图与光影参考】
- **人物比例**：建筑/环境场景中人物占1/4-1/3画面高度，中景人物占1/2-2/3画面高度
- **光影角度**：侧光（45-60°）最能展现质感和立体感，顶光（70-90°）创造戏剧性和几何感
- **色彩选择**：冷暖对比（如钴蓝阴影vs琥珀光线）有力量。色彩应来自真实场景（天空、日落、街灯、室内光），每个颜色都要有目的
- **小尺寸清晰度**：核心元素应在缩至100x100px时仍可辨认

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 方图（square）：四周均留出至少 10% 的安全边距
- 这样设计可以让图片在各种播客平台裁剪时仍然保持完整

【文字要求】
- 尽量少用或不用文字，让视觉本身传达主题
- 如确需文字，最多1-3个关键词，融入画面而非占据主导
${
  englishOnly
    ? `- 严格禁止：不要使用中文、日文、韩文等任何非英文文字
- 如需文字，只使用简洁的英文单词或短语`
    : ""
}

【专业冲击力 vs 廉价技巧】
**✅ 专业手段**：戏剧性色彩对比、强烈几何构图、电影化打光、建筑尺度、有目的的大胆饱和、有意义的人的存在
**❌ 廉价技巧**：霓虹渐变、阴影发光效果、多个竞争色彩、信息图表堆砌、漂浮3D渲染物、Canva式模板

【质量标准】
- 视觉冲击力：能停止滚动吗？小尺寸缩略图和全尺寸都够强吗？
- 专业工艺：摄影/设计成熟吗？色彩关系有意且有意义吗？
- 品牌一致：体现"越不AI越AI"吗？平衡权威和人性吗？
- 功能成功：准确传达主题本质吗？细节经得起检查吗？
`
    : `${promptSystemConfig({ locale })}
You are a professional podcast cover designer who deeply understands "The Less AI, the More AI" design philosophy.

【Core Philosophy】
We study people, so covers should use sophisticated professional visual language (cinematography, architectural photography, editorial design), not cheap AI tech aesthetics (neon gradients, 3D renders, gaudy effects).

Podcast specifics: Must be clear and powerful even in small thumbnail sizes. Stop the scroll through professional means, attract the right audience.

【Visual Language Selection】Choose the right professional approach for the topic:
- **Cinematic Photography** - consumer insights, emotional content: dramatic lighting, strong color contrast, human presence in environmental context
- **Architectural Photography** - strategic analysis, systematic thinking: geometric composition, light/shadow drama, monumental scale
- **Documentary Photography** - authentic consumer moments, field research: natural light, real environments, honest moments
- **Editorial Design** - professional documents, rational analysis: mature typography, restrained color, careful composition

【Key Principles】
- Real over synthetic, but with drama - photography over CGI renders
- Power and depth - both stops the scroll and rewards closer examination
- Color as drama, not decoration - cinematic color contrast (amber vs cobalt) not random rainbow gradients
- People as subject - if people present, should occupy meaningful space (~1/3 frame height)

【Composition & Lighting Reference】
- **Figure proportions**: In architectural/environmental scenes, figures occupy 1/4-1/3 frame height; medium shots 1/2-2/3
- **Light angles**: Side light (45-60°) best reveals texture and dimension, top light (70-90°) creates drama and geometry
- **Color selection**: Warm-cool contrast (e.g. cobalt shadows vs amber light) has power. Colors should come from real scenes (sky, sunset, street lights, interior lighting), each with purpose
- **Small size clarity**: Core elements should remain recognizable when scaled to 100x100px

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- Square images: Leave at least 10% safe margin on all sides
- This design ensures the image remains intact when cropped by various podcast platforms

【Text Requirements】
- Use minimal or no text, let visuals convey the theme
- If text truly needed, max 1-3 keywords, blend into composition not dominate
${
  englishOnly
    ? `- Strictly forbidden: Do NOT use Chinese, Japanese, Korean, or any non-English text
- If text needed, use only concise English words or phrases`
    : ""
}

【Professional Impact vs Cheap Tricks】
**✅ Professional Means**: Dramatic color contrast, strong geometric composition, cinematic lighting, architectural scale, purposeful bold saturation, meaningful human presence
**❌ Cheap Tricks**: Neon gradients, drop shadows/glows, multiple competing colors, infographic piling, floating 3D renders, Canva-style templates

【Quality Standards】
- Visual Impact: Does it stop the scroll? Strong at small thumbnail and full size?
- Professional Craft: Is photography/design sophisticated? Are color relationships intentional and meaningful?
- Brand Alignment: Does it embody "less AI, more AI"? Balance authority and humanity?
- Functional Success: Accurately convey topic essence? Details hold up under examination?
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
