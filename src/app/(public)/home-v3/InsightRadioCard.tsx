"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, Volume2Icon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { pickRandomFeaturedPodcast } from "../insight-radio/actions";

type FeaturedPodcast = {
  id: number;
  createdAt: Date;
  title: string;
  description: string;
  coverUrl: string | null;
  url: string;
  category?: string;
  podcast: {
    token: string;
    objectUrl: string | null;
    script: string | null;
  };
};

export function InsightRadioCard() {
  const t = useTranslations("HomePageV3.HeroSection.insightRadio");
  const [podcast, setPodcast] = useState<FeaturedPodcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const locale = useLocale();

  useEffect(() => {
    pickRandomFeaturedPodcast({ locale })
      .then((result) => {
        if (result.success && result.data) {
          setPodcast(result.data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch podcast:", error);
        setLoading(false);
      });
  }, [locale]);

  if (loading || !isVisible) {
    return null;
  }

  if (!podcast) {
    return null;
  }

  return (
    <>
      {/* Desktop: Fixed floating card - bottom right */}
      <div
        className={cn(
          "hidden md:block",
          "fixed bottom-6 left-6 w-80 z-50",
          "bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl",
          "p-5 space-y-4",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Volume2Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-foreground flex-1">{t("title")}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={() => setIsVisible(false)}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Podcast Info */}
        <div className="space-y-2">
          <Link href={podcast.url} target="_blank" className="block">
            <h4 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
              {podcast.title}
            </h4>
          </Link>
          <p className="text-xs text-muted-foreground line-clamp-2">{podcast.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1 h-8 text-xs rounded-full" asChild>
            <Link href={podcast.url} target="_blank">
              <Volume2Icon className="w-3 h-3" />
              {t("listen")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3" asChild>
            <Link href="/insight-radio" prefetch={true}>
              {t("viewAll")}
              <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile: Fixed card at bottom */}
      <div
        className={cn(
          "md:hidden",
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-xl border-t border-border shadow-lg",
          "p-3",
        )}
      >
        {/* Compact layout for mobile */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 shrink-0 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Volume2Icon className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-muted-foreground mb-1">{t("title")}</h3>
            <Link href={podcast.url} target="_blank" className="block">
              <h4 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
                {podcast.title}
              </h4>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" className="h-9 w-9 rounded-full p-0" asChild>
              <Link href={podcast.url} target="_blank">
                <Volume2Icon className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" asChild>
              <Link href="/insight-radio" prefetch={true}>
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => setIsVisible(false)}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
