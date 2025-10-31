import { getPodcastAudioSignedUrl } from "@/app/(podcast)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Loader2Icon, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export function StickyPlayer({
  podcastToken,
  title,
  studyReplayUrl,
  moreInsightRadioUrl,
}: {
  podcastToken: string;
  title: string;
  studyReplayUrl?: string;
  moreInsightRadioUrl?: string;
}) {
  const t = useTranslations("PodcastSharePage");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(50);

  // Load audio URL
  useEffect(() => {
    const loadAudioUrl = async () => {
      try {
        setIsLoading(true);
        const result = await getPodcastAudioSignedUrl({ podcastToken });
        if (!result.success) throw result;
        setAudioUrl(result.data);
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

  const handleProgressChange = useCallback(
    (value: number[]) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const newTime = value[0];
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = Math.min(audio.currentTime + 30, duration);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(audio.currentTime - 15, 0);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = newVolume[0];
    audio.volume = vol / 100;
    setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = previousVolume / 100;
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      audio.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, previousVolume]);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return "0:00";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  if (error) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 text-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Sticky Player */}
      <div className="bg-background/80 backdrop-blur-sm text-foreground border-t border-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Title */}
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-medium text-foreground line-clamp-2 mb-1">
              {title}
            </h3>
            {/* Navigation Links */}
            {(studyReplayUrl || moreInsightRadioUrl) && (
              <div className="flex items-center gap-3 mt-2">
                {studyReplayUrl && (
                  <Link
                    href={studyReplayUrl}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                    target="_blank"
                  >
                    {t("viewStudy")}
                  </Link>
                )}
                {moreInsightRadioUrl && (
                  <Link
                    href={moreInsightRadioUrl}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                    target="_blank"
                  >
                    {t("moreInsightRadioShort")}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar with Time */}
          <div className="mb-4">
            <Slider
              value={[currentTime]}
              onValueChange={handleProgressChange}
              max={duration || 100}
              step={0.1}
              className="cursor-pointer"
              disabled={!audioUrl || !duration}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(duration - currentTime)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Playback Speed */}
            <div className="flex flex-col items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm font-medium"
                  >
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top">
                  {[0.5, 0.75, 1, 1.5, 2].map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={playbackRate === rate ? "bg-accent" : ""}
                    >
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Rewind 15s */}
            <div className="relative size-8 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={skipBackward}
                disabled={isLoading || !audioUrl}
                className="size-full rounded-full absolute left-0 top-0"
              >
                <RotateCcw className="size-full rotate-45" />
              </Button>
              <span className="text-xs font-bold">15</span>
            </div>

            {/* Play/Pause */}
            <Button
              size="icon"
              onClick={togglePlayPause}
              disabled={isLoading || !audioUrl}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full"
            >
              {isLoading ? (
                <Loader2Icon className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" />
              )}
            </Button>

            {/* Fast Forward 30s */}
            <div className="relative size-8 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                disabled={isLoading || !audioUrl}
                className="size-full rounded-full absolute left-0 top-0"
              >
                <RotateCw className="size-full -rotate-45" />
              </Button>
              <span className="text-xs font-bold">30</span>
            </div>

            {/* Mute/Volume - Hidden on small screens */}
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Volume Control - Desktop only */}
          <div className="hidden sm:flex items-center gap-3 max-w-xs mx-auto mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 flex-shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </>
  );
}
