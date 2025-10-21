import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import MyPodcastsClient from "./MyPodcastsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyPodcastsPage");
  return {
    title: t("title"),
  };
}

export default async function MyPodcastsPage() {
  return <MyPodcastsClient />;
}

