"use client";

import { fetchUserPodcasts, getPodcastPlaybackUrl } from "@/app/(podcast)/podcasts/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import {
  CalendarDaysIcon,
  FileTextIcon,
  HeadphonesIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  Volume2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PodcastItem = ExtractServerActionData<typeof fetchUserPodcasts>[number];

// Placeholder podcasts for demo
const placeholderPodcasts = [
  {
    id: 1,
    token: "demo-1",
    analystId: 1,
    script: "Sample podcast script",
    objectUrl: null,
    generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    extra: {},
    analyst: {
      id: 1,
      topic: "Understanding Gen Z Consumer Preferences",
      studyUserChat: {
        title: "Market Research: Next Generation Consumers",
      },
    },
  },
  {
    id: 2,
    token: "demo-2",
    analystId: 2,
    script: "Sample podcast script",
    objectUrl: null,
    generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    extra: {},
    analyst: {
      id: 2,
      topic: "The Future of Remote Work Culture",
      studyUserChat: {
        title: "Workplace Trends Analysis 2024",
      },
    },
  },
  {
    id: 3,
    token: "demo-3",
    analystId: 3,
    script: "Sample podcast script",
    objectUrl: null,
    generatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    extra: {},
    analyst: {
      id: 3,
      topic: "Sustainable Business Practices Impact",
      studyUserChat: {
        title: "Corporate Sustainability Research",
      },
    },
  },
  {
    id: 4,
    token: "demo-4",
    analystId: 4,
    script: "Sample podcast script",
    objectUrl: null,
    generatedAt: null,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    extra: {},
    analyst: {
      id: 4,
      topic: "Social Media Influence on Purchasing Decisions",
      studyUserChat: {
        title: "Digital Marketing Effectiveness Study",
      },
    },
  },
  {
    id: 5,
    token: "demo-5",
    analystId: 5,
    script: "Sample podcast script",
    objectUrl: null,
    generatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    extra: {},
    analyst: {
      id: 5,
      topic: "AI-Powered Customer Service Experience",
      studyUserChat: {
        title: "Technology Adoption in Service Industry",
      },
    },
  },
];

export default function MyPodcastsClient() {
  const t = useTranslations("MyPodcastsPage");
  const locale = useLocale();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadPodcasts = useCallback(async () => {
    try {
      const result = await fetchUserPodcasts();
      if (!result.success) throw result;
      // Use real data if available, otherwise use placeholder data
      setPodcasts(result.data.length > 0 ? result.data : (placeholderPodcasts as any));
    } catch (error) {
      // On error, show placeholder data for demo
      setPodcasts(placeholderPodcasts as any);
      console.error("Load podcasts error:", error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playPodcast = useCallback(
    async (podcastToken: string) => {
      if (playingPodcast === podcastToken) {
        // Pause current audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setPlayingPodcast(null);
        return;
      }

      try {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
        }

        // Get signed URL for the podcast
        const result = await getPodcastPlaybackUrl({ podcastToken });
        if (!result.success || !result.data) {
          toast.error(t("playFailed"));
          return;
        }

        // Create new audio element
        const audio = new Audio(result.data);
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
            setPlayingPodcast(podcastToken);
          })
          .catch(() => {
            toast.error(t("playFailed"));
            setPlayingPodcast(null);
          });
      } catch (error) {
        toast.error(t("playFailed"));
        console.error("Play audio error:", error);
      }
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
              const studyTitle = podcast.analyst.studyUserChat?.title || t("untitledStudy");
              const hasAudio = podcast.objectUrl && podcast.generatedAt;

              return (
                <Card
                  key={podcast.id}
                  className="transition-all duration-300 hover:shadow-md flex flex-col border border-zinc-200 dark:border-zinc-700 shadow-sm bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-800 dark:to-zinc-700/50"
                >
                  <CardHeader>
                    {/* Header with icon and meta info */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Podcast Icon - small like StudyCard avatar */}
                        <div className="size-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center ring-2 ring-zinc-100 dark:ring-zinc-800 flex-shrink-0">
                          <Volume2Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDaysIcon className="h-3.5 w-3.5" />
                            <span>{formatDate(podcast.createdAt, locale)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{hasAudio ? "Ready" : "Processing"}</span>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                hasAudio ? "bg-green-400" : "bg-amber-400 animate-pulse"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Playing Indicator */}
                      {isPlaying && (
                        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          Playing
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    {/* Title */}
                    <h3 className="text-lg font-semibold line-clamp-2 leading-6 text-zinc-900 dark:text-zinc-100">
                      {podcast.analyst.topic}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                      {studyTitle}
                    </p>

                    {/* Stats section */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg flex items-center justify-start gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400">
                        <HeadphonesIcon className="h-4 w-4" />
                        <span className="font-medium">Podcast</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileTextIcon className="h-3.5 w-3.5" />
                        <span>1 Report</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    {hasAudio ? (
                      <Button
                        variant={isPlaying ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => playPodcast(podcast.token)}
                      >
                        {isPlaying ? (
                          <>
                            <PauseIcon className="h-4 w-4 mr-1.5" />
                            Pause Podcast
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4 mr-1.5" />
                            Play Podcast
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Volume2Icon className="h-4 w-4 mr-1.5" />
                        Generating Audio...
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

