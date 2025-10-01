import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PitchEN } from "./PitchEN";
import { PitchZH } from "./PitchZH";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "项目介绍" : "Company Pitch";
  const description =
    locale === "zh-CN"
      ? "了解 Atypica 如何用 AI 重写千亿美元的市场研究行业，从传统调研转向智能洞察。"
      : "Learn how Atypica is rewriting the $140B market research industry with AI, transforming traditional surveys into intelligent insights.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

async function PitchPage() {
  const locale = await getLocale();
  let showPresenterNotes = false;

  try {
    await checkTezignAuth();
    showPresenterNotes = true;
  } catch {
    showPresenterNotes = false;
  }

  return locale === "zh-CN" ? (
    <PitchZH showPresenterNotes={showPresenterNotes} />
  ) : (
    <PitchEN showPresenterNotes={showPresenterNotes} />
  );
}

export default async function PitchPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PitchPage />
    </Suspense>
  );
}
