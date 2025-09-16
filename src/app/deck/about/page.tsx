import { checkTezignAuth } from "@/app/admin/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { AboutEN } from "./AboutEN";
import { AboutZH } from "./AboutZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "技术介绍" : "Tech Overview";
  const description =
    locale === "zh-CN"
      ? "了解 Atypica 的技术架构和 AI 智能体建模方法，探索商业研究的创新技术实现。"
      : "Learn about Atypica's technical architecture and AI agent modeling methods, exploring innovative technology implementations for business research.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  let showPresenterNotes = false;

  try {
    await checkTezignAuth();
    showPresenterNotes = true;
  } catch {
    showPresenterNotes = false;
  }

  return locale === "zh-CN" ? (
    <AboutZH showPresenterNotes={showPresenterNotes} />
  ) : (
    <AboutEN showPresenterNotes={showPresenterNotes} />
  );
}