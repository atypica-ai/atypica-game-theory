import authOptions from "@/app/(auth)/authOptions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UniversalChatPageClient } from "./UniversalChatPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("UniversalAgent.metadata");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as "zh-CN" | "en-US",
  });
}

export default async function UniversalChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <UniversalChatPageClient />;
}
