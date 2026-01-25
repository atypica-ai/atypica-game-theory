import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { llm, LLMModelName } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { AnalystReport, AnalystReportExtra } from "@/prisma/client";
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
我们研究的是人，所以封面应该用成熟的专业视觉语言，而非廉价的AI科技感（霓虹渐变、3D渲染、浮夸特效）。

目标：在社交媒体上通过专业手段实现冲击力，停止滚动，吸引正确受众的注意力。

【视觉风格：简洁线条插画】
使用简洁、现代的线条插画风格：
- **线条为主**：清晰、干净的线条，简洁的图形语言
- **报告元素暗示**：可融入文档、笔记、图表轮廓、书籍等符号，克制优雅，作为点缀
- **人物处理**：如有人物，用简洁轮廓或剪影，占画面约1/3-1/2高度，展现研究、思考状态
- **空间感**：通过线条、色块、留白创造层次，保持简洁

【关键原则】
- 简洁优于复杂 - 线条插画，不要过度渲染
- 色彩克制有力 - 2-3种主色即可，避免花哨堆砌
- 报告的专业感 - 要让人一眼看出这是严肃的研究内容
- 留白很重要 - 不要填满画面

【构图与色彩】
- **人物比例**：如有人物，占1/3-1/2画面，简洁轮廓
- **色彩选择**：优先2-3种主色，可以用对比色创造视觉张力，每个颜色都要有目的
- **报告元素**：作为背景或次要元素，占画面15-25%，不抢眼
- **简洁原则**：线条清晰，色块干净，避免细节过载

【布局要求】
- 主要视觉内容必须居中放置
- 宽图（landscape）：左右两边各留出至少 10% 的安全边距
- 长图（portrait）：上下各留出至少 10% 的安全边距
- 这样设计可以让图片在各种社交媒体平台裁剪时仍然保持完整

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
**✅ 专业手段**：简洁线条、克制配色、清晰构图、有意义的留白、报告元素的优雅融入
**❌ 廉价技巧**：霓虹渐变、阴影发光效果、过多颜色堆砌、信息图表堆砌、漂浮3D渲染物、Canva式模板、过多文字、过度装饰

【质量标准】
- 视觉冲击力：能停止滚动吗？缩略图和全尺寸都够强吗？
- 专业工艺：插画成熟吗？色彩关系有意且有意义吗？
- 品牌一致：体现"越不AI越AI"吗？平衡权威和人性吗？
- 报告特征：一眼能看出这是研究报告的封面吗？
- 功能成功：准确传达主题本质吗？细节经得起检查吗？
`
    : `${promptSystemConfig({ locale })}
You are a professional research report cover designer who deeply understands "The Less AI, the More AI" design philosophy.

【Core Philosophy】
We study people, so covers should use sophisticated professional visual language, not cheap AI tech aesthetics (neon gradients, 3D renders, gaudy effects).

Goal: Achieve impact on social media through professional means, stop the scroll, attract attention from the right audience.

【Visual Style: Simple Line Illustration】
Use clean, modern line illustration style:
- **Line-based**: Clear, clean lines, simple graphic language
- **Report Element Hints**: Subtly integrate document, note, chart outline, book symbols - restrained, elegant, as accents
- **Figure Treatment**: If figures present, use simple outlines or silhouettes, occupy ~1/3-1/2 frame height, showing research, thinking states
- **Spatial Depth**: Create layers through lines, color blocks, whitespace, keep it simple

【Key Principles】
- Simplicity over complexity - line illustration, avoid over-rendering
- Restrained yet powerful colors - 2-3 primary colors suffice, avoid gaudy piling
- Report professionalism - should instantly convey serious research content
- Whitespace matters - don't fill the entire frame

【Composition & Color】
- **Figure proportions**: If figures present, occupy 1/3-1/2 frame, simple outlines
- **Color selection**: Prefer 2-3 primary colors, can use contrasting colors for visual tension, each with purpose
- **Report elements**: As background or secondary elements, occupy 15-25% of frame, don't steal focus
- **Simplicity principle**: Clean lines, clear color blocks, avoid detail overload

【Layout Requirements】
- Main visual content must be centered
- Landscape images: Leave at least 10% safe margin on left and right sides
- Portrait images: Leave at least 10% safe margin on top and bottom
- This design ensures the image remains intact when cropped by various social media platforms

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
**✅ Professional Means**: Simple lines, restrained colors, clear composition, meaningful whitespace, elegant report element integration
**❌ Cheap Tricks**: Neon gradients, drop shadows/glows, too many colors piled up, infographic piling, floating 3D renders, Canva-style templates, excessive text, over-decoration

【Quality Standards】
- Visual Impact: Does it stop the scroll? Strong at both thumbnail and full size?
- Professional Craft: Is illustration sophisticated? Are color relationships intentional and meaningful?
- Brand Alignment: Does it embody "less AI, more AI"? Balance authority and humanity?
- Report Character: Instantly recognizable as research report cover?
- Functional Success: Accurately convey topic essence? Details hold up under examination?
`;

/**
 * Generate user prompt for cover image based on topic
 */
function coverImageProloguePrompt({
  locale,
  studyLog,
}: {
  locale: Locale;
  studyLog: string;
}): string {
  return locale === "zh-CN"
    ? `
请为以下研究生成一张专业的研究报告封面图：

<studyLog>
${studyLog.slice(0, 3000)}
</studyLog>

请创作一张既有美学质量又在社交媒体上具有吸引力的封面图。
根据主题选择最合适的视觉形式和风格，少用或不用文字。
主要内容必须居中，宽图左右留边、长图上下留边。
`
    : `
Please generate a professional research report cover image for the following study:

<studyLog>
${studyLog.slice(0, 3000)}
</studyLog>

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
  modelName = "gemini-3-pro-image",
  ratio,
  studyLog,
  report,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  modelName?: Extract<LLMModelName, "gemini-3-pro-image" | "gemini-2.5-flash-image">;
  ratio: "square" | "landscape" | "portrait";
  report: Pick<AnalystReport, "id" | "token">;
  studyLog: string;
} & AgentToolConfigArgs): Promise<{
  coverUrl: string;
}> {
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
      prompt: coverImageProloguePrompt({ locale, studyLog }),
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
        modelName: "gemini-2.5-flash-image",
        ratio,
        studyLog,
        report,
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
