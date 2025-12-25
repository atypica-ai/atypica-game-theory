import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { AffiliateEN } from "./AffiliateEN";
import { AffiliateZH } from "./AffiliateZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "联盟计划" : "Affiliate Program";
  const description =
    locale === "zh-CN"
      ? "加入 Atypica 联盟计划，通过推荐用户获得佣金。"
      : "Join Atypica Affiliate Program and earn commission by referring users.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const AffiliatePage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <AffiliateZH /> : <AffiliateEN />;
};

export default AffiliatePage;

