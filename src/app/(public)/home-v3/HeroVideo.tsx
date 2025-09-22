"use client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "plyr/dist/plyr.css";

const LoadingVideo = () => {
  const t = useTranslations("HomePageV3.HeroSection");
  return (
    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center">
      <div className="text-zinc-400 dark:text-zinc-600">{t("loadingVideo")}</div>
    </div>
  );
};

const Plyr = dynamic(() => import("plyr-react"), {
  ssr: false,
  loading: LoadingVideo,
});

interface HeroVideoProps {
  src?: string;
  poster?: string;
  className?: string;
}

export function HeroVideo({ src, poster, className }: HeroVideoProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("HomePageV3.HeroSection");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !src) {
    return (
      <div
        className={cn(
          "w-full h-full bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center",
          className,
        )}
      >
        <div className="text-zinc-400 dark:text-zinc-600">{t("loadingVideo")}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <style jsx>{`
        :global(.plyr) {
          width: 100% !important;
          height: 100% !important;
        }
        :global(.plyr__video-wrapper) {
          width: 100% !important;
          height: 100% !important;
        }
        :global(.plyr video) {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
      <Plyr
        source={{
          type: "video",
          sources: [
            {
              src,
              type: "video/mp4",
            },
          ],
          poster,
        }}
        options={{
          autoplay: true,
          muted: true,
          loop: { active: true },
          controls: ["play", "progress", "mute", "volume"],
          hideControls: true,
          clickToPlay: false,
          keyboard: { focused: false, global: false },
          volume: 0.5,
          toggleInvert: false,
          ratio: "16:9",
          fullscreen: { enabled: false },
        }}
      />
    </div>
  );
}
