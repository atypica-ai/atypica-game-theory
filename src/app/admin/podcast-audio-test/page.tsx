import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { PodcastAudioTestClient } from "./PodcastAudioTestClient";

export const metadata = {
  title: "Podcast Audio Test | Admin",
};

export default async function PodcastAudioTestPage() {
  // Check admin authorization
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  return <PodcastAudioTestClient />;
}

