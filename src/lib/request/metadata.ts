import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getDeployRegion } from "./deployRegion";

const POSTER_IMAGE = (() => {
  const homePageVideoPoster = "atypica/public/atypica-promo-video-poster-20250624.jpeg";
  try {
    const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
    const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
    if (!s3Config) {
      throw new Error("S3 configuration not found");
    }
    return `${s3Config.origin}${homePageVideoPoster}`;
  } catch {
    return undefined;
  }
})();

const siteTitles = {
  "zh-CN": "atypica.AI - 商业研究多智能体", // 为「主观世界」建模
  "en-US": "atypica.AI - The AI Research Agent Simulating Consumers", // AI-Powered Intelligence for Subjective Reality
};

const siteDescriptions = {
  "zh-CN": `AI 驱动的商业研究平台，自动生成用户画像、智能访谈分析、模拟消费者决策。将访谈转化为可交互的 AI 人物角色，深度洞察消费者情绪、市场认知和行为模式。适用于市场研究、产品验证、用户测试。`,
  "en-US": `AI-powered market research platform that automatically generates user personas, analyzes interviews, and simulates consumer decisions. Transform qualitative interviews into interactive AI personas for deep insights into consumer emotions, behaviors, and decision-making patterns.`,
};

export function generatePageMetadata({
  title,
  description,
  image,
  locale,
}: {
  title?: string;
  description?: string;
  image?: string;
  locale: Locale;
}): Pick<Metadata, "openGraph" | "twitter"> & {
  title: string;
  description: string;
} {
  const defaultDescription =
    siteDescriptions[locale as keyof typeof siteDescriptions] || siteDescriptions["en-US"];
  const defaultTitle = siteTitles[locale as keyof typeof siteTitles] || siteTitles["en-US"];
  description = description || defaultDescription;
  title = title || defaultTitle;

  image = image || POSTER_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : [],
      siteName: "atypica.AI",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
      creator: "@BMRLab",
      site: "@atypica_AI",
    },
  };
}
