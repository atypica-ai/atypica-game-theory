import { redirect } from "next/navigation";

export default async function LegacyFeaturedPodcastsPageRedirect() {
  redirect("/insight-radio");
}
