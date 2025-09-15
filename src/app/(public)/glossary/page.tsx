import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { GlossaryEN } from "./GlossaryEN";
import { GlossaryZH } from "./GlossaryZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "术语表" : "Glossary";
  const description =
    locale === "zh-CN"
      ? "浏览商业研究和人工智能相关术语的详细解释。"
      : "Browse detailed explanations of business research and AI-related terms.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const GlossaryPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <GlossaryZH /> : <GlossaryEN />;
};

export default GlossaryPage;
