import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { AboutEN } from "./AboutEN";
import { AboutZH } from "./AboutZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "关于我们" : "About Us";
  const description =
    locale === "zh-CN"
      ? "了解 atypica.AI 如何通过多智能体系统模拟消费者决策，为主观世界建模。"
      : "Learn how atypica.AI models the subjective world through AI agents that simulate consumer decision-making.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const AboutPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <AboutZH /> : <AboutEN />;
};

export default AboutPage;
