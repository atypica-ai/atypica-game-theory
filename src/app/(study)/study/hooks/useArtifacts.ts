"use client";
import {
  fetchAnalystPodcastsCountOfStudyUserChat,
  fetchAnalystPodcastsOfStudyUserChat,
  fetchAnalystReportsCountOfStudyUserChat,
  fetchAnalystReportsOfStudyUserChat,
} from "@/app/(study)/study/actions";
import { ExtractServerActionData } from "@/lib/serverAction";
import { useCallback, useState } from "react";

export type ArtifactsState = {
  reports: ExtractServerActionData<typeof fetchAnalystReportsOfStudyUserChat>;
  podcasts: ExtractServerActionData<typeof fetchAnalystPodcastsOfStudyUserChat>;
  isLoadingReports: boolean;
  isLoadingPodcasts: boolean;
  reportCount: number | null;
  podcastCount: number | null;
  isLoadingCounts: boolean;
  refresh: () => Promise<void>;
  refreshCount: () => Promise<void>;
};

export function useArtifacts(studyUserChatToken: string): ArtifactsState {
  const [artifactsData, setArtifactsData] = useState({
    reports: [] as ExtractServerActionData<typeof fetchAnalystReportsOfStudyUserChat>,
    podcasts: [] as ExtractServerActionData<typeof fetchAnalystPodcastsOfStudyUserChat>,
    isLoadingReports: false,
    isLoadingPodcasts: false,
    reportCount: null as number | null,
    podcastCount: null as number | null,
    isLoadingCounts: false,
  });

  const refresh = useCallback(async () => {
    setArtifactsData((prev) => ({
      ...prev,
      isLoadingReports: true,
      isLoadingPodcasts: true,
    }));

    try {
      const [reportsResult, podcastsResult] = await Promise.all([
        fetchAnalystReportsOfStudyUserChat({
          studyUserChatToken,
        }),
        fetchAnalystPodcastsOfStudyUserChat({
          studyUserChatToken,
        }),
      ]);

      setArtifactsData((prev) => ({
        ...prev,
        reports: reportsResult.success ? reportsResult.data : [],
        podcasts: podcastsResult.success ? podcastsResult.data : [],
        isLoadingReports: false,
        isLoadingPodcasts: false,
      }));
    } catch (error) {
      console.error("Failed to refresh artifacts:", error);
      setArtifactsData((prev) => ({
        ...prev,
        isLoadingReports: false,
        isLoadingPodcasts: false,
      }));
    }
  }, [studyUserChatToken]);

  const refreshCount = useCallback(async () => {
    setArtifactsData((prev) => ({
      ...prev,
      isLoadingCounts: true,
    }));

    try {
      const [reportsCountResult, podcastsCountResult] = await Promise.all([
        fetchAnalystReportsCountOfStudyUserChat({
          studyUserChatToken,
        }),
        fetchAnalystPodcastsCountOfStudyUserChat({
          studyUserChatToken,
        }),
      ]);

      setArtifactsData((prev) => ({
        ...prev,
        reportCount: reportsCountResult.success ? reportsCountResult.data : 0,
        podcastCount: podcastsCountResult.success ? podcastsCountResult.data : 0,
        isLoadingCounts: false,
      }));
    } catch (error) {
      console.error("Failed to refresh artifact counts:", error);
      setArtifactsData((prev) => ({
        ...prev,
        isLoadingCounts: false,
      }));
    }
  }, [studyUserChatToken]);

  return {
    ...artifactsData,
    refresh,
    refreshCount,
  };
}
