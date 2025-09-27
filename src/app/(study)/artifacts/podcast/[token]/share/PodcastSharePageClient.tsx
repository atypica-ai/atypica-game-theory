"use client";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { truncateForTitle } from "@/lib/textUtils";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { Loader2Icon, Pause, Play, RotateCcw, RotateCw, Share2 } from "lucide-react";
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
          {/*<UserTokensBalance />*/}
          <UserMenu />
        </div>
      </GlobalHeader>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl md:text-2xl font-medium text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-3">
              {truncateForTitle(analyst.topic, { maxDisplayWidth: 200, suffix: "..." })}
            </h1>
          </div>
        </section>

        {/* Audio Player Section */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-2xl mx-auto">
              {error ? (
                <div className="text-center py-16">
                  <p className="text-destructive text-lg">{error}</p>
                </div>
              ) : (
                <div className="space-y-8 md:space-y-12">
                  {/* Hidden audio element */}
                  {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

                  {/* Play controls */}
                  <div className="flex items-center justify-center gap-8 md:gap-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipBackward}
                      disabled={isLoading || !audioUrl}
                      className="h-14 w-14 md:h-16 md:w-16 touch-manipulation hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <RotateCcw className="size-5" />
                    </Button>

                    <Button
                      size="lg"
                      onClick={togglePlayPause}
                      disabled={isLoading || !audioUrl}
                      className="size-20 rounded-full touch-manipulation active:scale-95 transition-transform"
                    >
                      {isLoading ? (
                        <Loader2Icon className="size-6 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="size-6" />
                      ) : (
                        <Play className="size-6 ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipForward}
                      disabled={isLoading || !audioUrl}
                      className="h-14 w-14 md:h-16 md:w-16 touch-manipulation hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <RotateCw className="size-5" />
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-4 md:space-y-6">
                    <div className="relative">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-900 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-lg dark:[&::-webkit-slider-thumb]:bg-zinc-100 dark:[&::-moz-range-thumb]:bg-zinc-100"
                        style={{
                          background: `linear-gradient(to right, rgb(24 24 27) 0%, rgb(24 24 27) ${(currentTime / (duration || 100)) * 100}%, rgb(209 213 219) ${(currentTime / (duration || 100)) * 100}%, rgb(209 213 219) 100%)`,
                          ...(document.documentElement.classList.contains('dark') && {
                            background: `linear-gradient(to right, rgb(244 244 245) 0%, rgb(244 244 245) ${(currentTime / (duration || 100)) * 100}%, rgb(63 63 70) ${(currentTime / (duration || 100)) * 100}%, rgb(63 63 70) 100%)`,
                          }),
                        }}
                        disabled={isLoading || !audioUrl}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Transcript Section */}
        {podcast.script && (
          <section className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="container mx-auto px-4 py-12 md:py-16">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-lg md:text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-6 md:mb-8">
                  {t("transcript")}
                </h2>
                <div className="text-sm md:text-base leading-7 md:leading-8 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {podcast.script}
                </div>
              </div>
            </div>
          </section>
        )}
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
