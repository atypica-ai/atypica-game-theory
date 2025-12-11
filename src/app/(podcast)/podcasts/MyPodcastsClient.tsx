"use client";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarDaysIcon,
  HeadphonesIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  SquareArrowOutUpRightIcon,
  Volume2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetchMyPodcasts } from "./actions";

type PodcastItem = ExtractServerActionData<typeof fetchMyPodcasts>[number];

export default function MyPodcastsClient() {
  const t = useTranslations("MyPodcastsPage");
  const locale = useLocale();
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use SWR for data fetching
  const { data: podcasts = [], isLoading: loading } = useSWR(
    "my-podcasts",
    async () => {
      const result = await fetchMyPodcasts();
      if (!result.success) throw new Error("Failed to fetch podcasts");
      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onError: (error) => {
        console.error("Load podcasts error:", error);
      },
    },
  );

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playPodcast = useCallback(
    async (podcast: PodcastItem) => {
      if (playingPodcast === podcast.token) {
        // Pause current audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setPlayingPodcast(null);
        return;
      }

      const objectUrl = podcast.objectUrl;
      const mimeType = podcast.extra.metadata?.mimeType;
      if (!objectUrl || !mimeType) {
        toast.error(t("playFailed"));
        console.log("Missing object URL or MIME type", objectUrl, mimeType);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Get signed URL for the podcast
      const audioSrc = proxiedObjectCdnUrl({ name: undefined, objectUrl, mimeType });

      // Create new audio element
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        setPlayingPodcast(null);
      });

      audio.addEventListener("error", () => {
        toast.error(t("playFailed"));
        setPlayingPodcast(null);
      });

      audio
        .play()
        .then(() => {
          setPlayingPodcast(podcast.token);
        })
        .catch(() => {
          toast.error(t("playFailed"));
          setPlayingPodcast(null);
        });
    },
    [playingPodcast, t],
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="flex justify-center py-12">
          <Loader2Icon className="size-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
          <HeadphonesIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      {/* Podcasts Grid */}
      <div className="container mx-auto">
        {podcasts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("noPodcasts")}</h3>
            <p className="text-muted-foreground mb-6">{t("noPodcastsDescription")}</p>
            <Button asChild>
              <Link href="/newstudy">{t("startNewStudy")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {podcasts.map((podcast) => {
              const isPlaying = playingPodcast === podcast.token;
              const hasAudio = podcast.objectUrl && podcast.generatedAt;

              return (
                <Card
                  key={podcast.id}
                  className={cn(
                    "transition-all duration-300 hover:shadow-md flex flex-col",
                    "border border-zinc-200 dark:border-zinc-700 shadow-sm",
                    "bg-linear-to-br from-white to-zinc-50/50 dark:from-zinc-800 dark:to-zinc-700/50",
                  )}
                >
                  <CardHeader>
                    {/* Header with icon and meta info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Podcast Icon - small like StudyCard avatar */}
                        <div className="size-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shrink-0">
                          <Volume2Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDaysIcon className="h-3.5 w-3.5" />
                            <span>{formatDate(podcast.createdAt, locale)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{hasAudio ? t("statusReady") : t("statusProcessing")}</span>
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                hasAudio ? "bg-green-400" : "bg-amber-400 animate-pulse",
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Playing Indicator */}
                      {isPlaying && (
                        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          {t("playing")}
                        </div>
                      )}
                      {!isPlaying && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs rounded-full shadow-none"
                          asChild
                        >
                          <Link href={`/artifacts/podcast/${podcast.token}/share`} target="_blank">
                            <HeadphonesIcon className="size-3" />
                            <span>{t("share")}</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold line-clamp-2 leading-6 text-zinc-900 dark:text-zinc-100">
                        {podcast.extra.metadata?.title || podcast.analyst.studyUserChat.title}
                      </h3>
                      <Link
                        href={`/study/${podcast.analyst.studyUserChat.token}/share`}
                        target="_blank"
                      >
                        <SquareArrowOutUpRightIcon className="size-4 mt-1" />
                      </Link>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                      {podcast.analyst.topic}
                    </p>

                    {/* Stats section */}
                    {/*<div className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg flex items-center justify-start gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400">
                        <HeadphonesIcon className="h-4 w-4" />
                        <span className="font-medium">{t("podcastLabel")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileTextIcon className="h-3.5 w-3.5" />
                        <span>1 Report</span>
                      </div>
                    </div>*/}
                  </CardContent>

                  <CardFooter className="pt-0">
                    {hasAudio ? (
                      <Button
                        variant={isPlaying ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => playPodcast(podcast)}
                      >
                        {isPlaying ? (
                          <>
                            <PauseIcon className="h-4 w-4 mr-1.5" />
                            {t("pausePodcast")}
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4 mr-1.5" />
                            {t("playPodcast")}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Volume2Icon className="h-4 w-4 mr-1.5" />
                        {t("generatingAudio")}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}
