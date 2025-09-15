import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { JoinUsEN } from "./JoinUsEN";
import { JoinUsZH } from "./JoinUsZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "加入我们" : "Join Us";
  const description =
    locale === "zh-CN"
      ? "加入我们的团队，与优秀的人才一起构建 AI 的未来。"
      : "Join our team of talented individuals and help us build the future of AI.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const JoinUsPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <JoinUsZH /> : <JoinUsEN />;
};

export default JoinUsPage;
