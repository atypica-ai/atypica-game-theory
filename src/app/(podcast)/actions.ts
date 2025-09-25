"use server";

import { 
  fetchPodcastsForAnalyst, 
  backgroundGeneratePodcastScript,
  PodcastGenerationParams 
} from "./lib";

// Re-export the core functions as server actions
export async function fetchAnalystPodcasts({ analystId }: { analystId: number }) {
  return fetchPodcastsForAnalyst(analystId);
}

export async function backgroundGeneratePodcast(params: PodcastGenerationParams) {
  return backgroundGeneratePodcastScript(params);
} 