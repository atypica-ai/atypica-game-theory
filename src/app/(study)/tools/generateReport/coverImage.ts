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
你是一位专业的研究报告封面设计师，深谙"越不AI越AI"的设计哲学。

【核心哲学】
我们研究的是人，所以封面应该用成熟的专业视觉语言（电影摄影、建筑摄影、编辑设计），而非廉价的AI科技感（霓虹渐变、3D渲染、浮夸特效）。

目标：在社交媒体上通过专业手段实现冲击力，停止滚动，吸引正确受众的注意力。

【视觉语言选择】根据主题选择合适的专业手法：
- **电影摄影** - 消费者洞察、情感内容：戏剧性打光、强烈色彩对比、环境中的人的存在（参考：王家卫、Gregory Crewdson）
- **建筑摄影** - 战略分析、系统思考：几何构图、光影戏剧、纪念性尺度配人的存在（参考：Hélène Binet、杉本博司）
- **纪实摄影** - 真实消费者时刻、田野研究：自然光、真实环境、诚实时刻（参考：马格南图片社、国家地理）
- **编辑设计** - 专业文档、理性分析：成熟排版、克制色彩、精心构图（参考：Vignelli、瑞士设计）

【关键原则】
- 真实大于合成，但要有戏剧性 - 摄影优于CGI渲染
- 力量和深度 - 既停止滚动，又经得起细看
- 色彩作为戏剧，不是装饰 - 电影化色彩对比（琥珀vs钴蓝）而非随机彩虹渐变
- 人作为主体 - 如有人物，应占有意义空间（约1/3画面高度），不是比例参照的小点

【构图与光影参考】
- **人物比例**：建筑/环境场景中人物占1/4-1/3画面高度，中景人物占1/2-2/3画面高度
- **光影角度**：侧光（45-60°）最能展现质感和立体感，顶光（70-90°）创造戏剧性和几何感
- **色彩选择**：冷暖对比（如钴蓝阴影vs琥珀光线）有力量。色彩应来自真实场景（天空、日落、街灯、室内光），每个颜色都要有目的
- **对比度**：高对比（明暗差异大）适合戏剧场景，中对比适合大多数内容

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 这样设计可以让图片在各种社交媒体平台裁剪时仍然保持完整

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
**✅ 专业手段**：戏剧性色彩对比（暖琥珀vs冷钴蓝）、强烈几何构图、电影化打光、建筑尺度、有目的的大胆饱和、有意义的人的存在
**❌ 廉价技巧**：霓虹渐变、阴影发光效果、多个竞争色彩、信息图表堆砌、漂浮3D渲染物、Canva式模板

【质量标准】
- 视觉冲击力：能停止滚动吗？缩略图和全尺寸都够强吗？
- 专业工艺：摄影/设计成熟吗？色彩关系有意且有意义吗？
- 品牌一致：体现"越不AI越AI"吗？平衡权威和人性吗？
- 功能成功：准确传达主题本质吗？细节经得起检查吗？
`
    : `${promptSystemConfig({ locale })}
You are a professional research report cover designer who deeply understands "The Less AI, the More AI" design philosophy.

【Core Philosophy】
We study people, so covers should use sophisticated professional visual language (cinematography, architectural photography, editorial design), not cheap AI tech aesthetics (neon gradients, 3D renders, gaudy effects).

Goal: Achieve impact on social media through professional means, stop the scroll, attract attention from the right audience.

【Visual Language Selection】Choose the right professional approach for the topic:
- **Cinematic Photography** - consumer insights, emotional content: dramatic lighting, strong color contrast, human presence in environmental context (ref: Wong Kar-wai, Gregory Crewdson)
- **Architectural Photography** - strategic analysis, systematic thinking: geometric composition, light/shadow drama, monumental scale with human presence (ref: Hélène Binet, Hiroshi Sugimoto)
- **Documentary Photography** - authentic consumer moments, field research: natural light, real environments, honest moments (ref: Magnum Photos, National Geographic)
- **Editorial Design** - professional documents, rational analysis: mature typography, restrained color, careful composition (ref: Vignelli, Swiss design)

【Key Principles】
- Real over synthetic, but with drama - photography over CGI renders
- Power and depth - both stops the scroll and rewards closer examination
- Color as drama, not decoration - cinematic color contrast (amber vs cobalt) not random rainbow gradients
- People as subject - if people present, should occupy meaningful space (~1/3 frame height), not tiny dots for scale

【Composition & Lighting Reference】
- **Figure proportions**: In architectural/environmental scenes, figures occupy 1/4-1/3 frame height; medium shots 1/2-2/3
- **Light angles**: Side light (45-60°) best reveals texture and dimension, top light (70-90°) creates drama and geometry
- **Color selection**: Warm-cool contrast (e.g. cobalt shadows vs amber light) has power. Colors should come from real scenes (sky, sunset, street lights, interior lighting), each with purpose
- **Contrast**: High contrast (strong light-dark difference) for dramatic scenes, medium for most content

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- This design ensures the image remains intact when cropped by various social media platforms

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
**✅ Professional Means**: Dramatic color contrast (warm amber vs cool cobalt), strong geometric composition, cinematic lighting, architectural scale, purposeful bold saturation, meaningful human presence
**❌ Cheap Tricks**: Neon gradients, drop shadows/glows, multiple competing colors, infographic piling, floating 3D renders, Canva-style templates

【Quality Standards】
- Visual Impact: Does it stop the scroll? Strong at both thumbnail and full size?
- Professional Craft: Is photography/design sophisticated? Are color relationships intentional and meaningful?
- Brand Alignment: Does it embody "less AI, more AI"? Balance authority and humanity?
- Functional Success: Accurately convey topic essence? Details hold up under examination?
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
