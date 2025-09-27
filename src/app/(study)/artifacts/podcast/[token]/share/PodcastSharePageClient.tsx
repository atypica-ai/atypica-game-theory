"use client";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UserMenu from "@/components/UserMenu";
import UserTokensBalance from "@/components/UserTokensBalance";
import { truncateForTitle } from "@/lib/textUtils";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { Loader2Icon, Pause, Play, RotateCcw, RotateCw, Share2, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getPodcastAudioUrl } from "../../actions";

interface PodcastSharePageClientProps {
  podcastToken: string;
  podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt">;
  analyst: Pick<Analyst, "id" | "topic" | "studySummary">;
  studyReplayUrl: string;
}

export default function PodcastSharePageClient({
  podcastToken,
  podcast,
  analyst,
  studyReplayUrl,
}: PodcastSharePageClientProps) {
  const t = useTranslations("PodcastSharePage");
  const tCompliance = useTranslations("AICompliance");
  const pathname = usePathname();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load audio URL
  useEffect(() => {
    const loadAudioUrl = async () => {
      try {
        setIsLoading(true);
        const result = await getPodcastAudioUrl(podcastToken);
        if (result.success) {
          setAudioUrl(result.data);
        } else {
          setError(result.message || "Failed to load audio");
        }
      } catch {
        setError("Failed to load audio");
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioUrl();
  }, [podcastToken]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.min(audio.currentTime + 15, duration);
    seekTo(newTime);
  }, [duration, seekTo]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(audio.currentTime - 15, 0);
    seekTo(newTime);
  }, [seekTo]);

  const copyShareLink = useCallback(() => {
    const url = window.location.origin + pathname;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("linkCopied"));
    });
  }, [pathname, t]);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <GlobalHeader className="h-12">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
            <Link href={studyReplayUrl}>
              <Play size={14} />
              <span className="max-sm:text-xs max-sm:tracking-tighter">{t("viewReplay")}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyShareLink}>
            <Share2 size={14} />
            <span className="hidden sm:inline">{t("copyLink")}</span>
          </Button>
          <UserTokensBalance />
          <UserMenu />
        </div>
      </GlobalHeader>

      <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto scrollbar-thin">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Podcast Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl md:text-2xl font-medium line-clamp-3">{analyst.topic}</h1>
            <p className="text-muted-foreground">{t("title")}</p>
          </div>

          {/* Audio Player */}
          <Card className="w-full">
            <CardContent className="px-6 py-3">
              {error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Hidden audio element */}
                  {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

                  {/* Play controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipBackward}
                      disabled={isLoading || !audioUrl}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                      size="lg"
                      onClick={togglePlayPause}
                      disabled={isLoading || !audioUrl}
                      className="h-10 w-10 rounded-full"
                    >
                      {isLoading ? (
                        <Loader2Icon className="h-6 w-6 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipForward}
                      disabled={isLoading || !audioUrl}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading || !audioUrl}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Volume indicator */}
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">{t("audioPlayer")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Script Content */}
          {podcast.script && (
            <Card className="w-full">
              <CardContent className="px-6">
                <h2 className="text-lg font-semibold mb-4">{t("transcript")}</h2>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {podcast.script}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <footer className="py-2 px-4 text-center text-xs text-muted-foreground border-t border-border">
        {t("attribution", {
          topic: truncateForTitle(analyst.topic, { maxDisplayWidth: 30, suffix: "..." }),
        })}{" "}
        {tCompliance("shortDisclaimer")}
        {tCompliance("period")}
      </footer>
    </div>
  );
}
