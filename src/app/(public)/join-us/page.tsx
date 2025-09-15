import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { JoinUsEN } from "./JoinUsEN";
import { JoinUsZH } from "./JoinUsZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title =
    locale === "zh-CN"
      ? "加入 atypica.AI - 与优秀人才一起构建 AI 的未来"
      : "Join atypica.AI - Build the Future of AI with Talented Individuals";

  return generatePageMetadata({
    title,
    locale,
  });
}

const JoinUsPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <JoinUsZH /> : <JoinUsEN />;
};

export default JoinUsPage;
