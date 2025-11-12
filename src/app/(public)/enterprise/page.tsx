import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { EnterpriseEN } from "./EnterpriseEN";
import { EnterpriseZH } from "./EnterpriseZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "企业版" : "Enterprise";
  const description =
    locale === "zh-CN"
      ? "atypica.AI 企业版 - 为规模化运营的企业提供完整的 AI 用户研究解决方案"
      : "atypica.AI Enterprise - Complete AI-powered user research solution for businesses operating at scale";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const EnterprisePage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <EnterpriseZH /> : <EnterpriseEN />;
};

export default EnterprisePage;
