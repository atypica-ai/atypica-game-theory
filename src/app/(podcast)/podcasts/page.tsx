import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import MyPodcastsClient from "./MyPodcastsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyPodcastsPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

export default async function MyPodcastsPage() {
  return <MyPodcastsClient />;
}
