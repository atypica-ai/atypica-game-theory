import "server-only";

import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { uploadToS3 } from "@/lib/attachments/s3";
import { Analyst, AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import { GeneratedFile, stepCountIs, streamText } from "ai";
import { createHash } from "crypto";
import { Locale } from "next-intl";

/**
 * Generate system prompt for cover image generation
 */
const coverImageSystem = ({ locale }: { locale: Locale }): string =>
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
function coverImagePrompt({
  locale,
  analyst,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "locale" | "topic" | "studySummary" | "studyLog" | "brief">;
}): string {
  const { topic, studySummary, studyLog, brief } = analyst;

  return locale === "zh-CN"
    ? `
请为以下商业研究生成一张专业的封面图：

【研究主题】
${topic}

${brief ? `【原始研究需求】\n${brief}\n` : ""}

${studySummary ? `【研究总结】\n${studySummary}\n` : ""}

${studyLog ? `【研究详情】\n${studyLog.substring(0, 2000)}...\n` : ""}

请生成一张能够准确表达这个研究主题、适合社交媒体分享的专业封面图。
`
    : `
Please generate a professional cover image for the following business research:

【Research Topic】
${topic}

${brief ? `【Original Research Requirements】\n${brief}\n` : ""}

${studySummary ? `【Research Summary】\n${studySummary}\n` : ""}

${studyLog ? `【Research Details】\n${studyLog.substring(0, 2000)}...\n` : ""}

Please generate a professional cover image that accurately represents this research topic and is suitable for social media sharing.
`;
}

/**
 * Generate report cover image using Gemini 3 Pro Image model
 * Falls back to screenshot generation if image generation fails
 */
export async function generateReportCoverImage({
  analyst,
  report,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  report: Pick<AnalystReport, "id" | "token">;
  analyst: Pick<Analyst, "id" | "locale" | "topic" | "studySummary" | "studyLog" | "brief">;
} & AgentToolConfigArgs): Promise<{
  coverUrl: string;
}> {
  logger.info({ msg: "Starting cover image generation with Gemini 3 Pro Image" });
  const promise = new Promise<{ text: string; files: GeneratedFile[] }>(async (resolve, reject) => {
    const response = streamText({
      model: llm("gemini-3-pro-image"),
      providerOptions: defaultProviderOptions,
      system: coverImageSystem({ locale }),
      prompt: coverImagePrompt({ locale, analyst }),
      abortSignal: abortSignal || AbortSignal.timeout(300 * 1000), // 5 minutes timeout
      stopWhen: stepCountIs(3),
      onChunk: (chunk) => {
        logger.debug({ msg: "Cover image chunk received", chunk });
      },
      onFinish: async ({ text, files, usage }) => {
        logger.info(`generateReportCoverImage streamText onFinish`);
        // TODO: Nano Banana 3 Pro 的价格要重新核算下
        if (usage.totalTokens && statReport) {
          await statReport("tokens", usage.totalTokens, {
            reportedBy: "report cover image",
            analystId: analyst.id,
          });
        }
        resolve({ text, files });
      },
      onError: ({ error }) => {
        logger.info(`generateReportCoverImage streamText onError: ${(error as Error).message}`);
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
    throw new Error("No image file generated from Gemini 3 Pro Image");
  }

  logger.info({ msg: "Image generated successfully", mediaType: imageFile.mediaType });
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
      s3SignedCoverObjectUrl: null,
      s3SignedCoverObjectUrlExpiresAt: null,
    } satisfies AnalystReportExtra,
  });

  logger.info({ msg: "Cover image uploaded to S3", objectUrl });
  return {
    coverUrl: getObjectUrl,
  };
}
