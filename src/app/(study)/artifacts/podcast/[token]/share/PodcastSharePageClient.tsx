"use client";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { DownloadIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { StickyPlayer } from "./components/StickyPlayer";

function SharePageHeader({
  copyShareLink,
  onDownload,
}: {
  copyShareLink: () => void;
  onDownload?: () => void;
}) {
  const t = useTranslations("PodcastSharePage");
  return (
    <GlobalHeader className="h-12">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 has-[>svg]:px-2 gap-1.5 text-xs"
          onClick={copyShareLink}
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">{t("copyLink")}</span>
        </Button>
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 has-[>svg]:px-2 gap-1.5 text-xs"
            onClick={onDownload}
          >
            <DownloadIcon className="size-4" />
            <span className="hidden sm:inline">{t("download")}</span>
          </Button>
        )}
      </div>
    </GlobalHeader>
  );
}

export default function PodcastSharePageClient({
  podcast,
  // analyst,
  title,
  studyUserChatToken,
  coverCdnHttpUrl,
}: {
  podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl"> & {
    extra: AnalystPodcastExtra;
  };
  analyst: Pick<Analyst, "id" | "topic">;
  title: string;
  studyUserChatToken: string;
  coverCdnHttpUrl?: string;
}) {
  const t = useTranslations("PodcastSharePage");
  const pathname = usePathname();
  const [podcastAudioSrc, setPodcastAudioSrc] = useState<string | null>(null);

  // Load audio URL for download
  useEffect(() => {
    const objectUrl = podcast.objectUrl;
    const mimeType = podcast.extra.metadata?.mimeType;
    if (objectUrl && mimeType) {
      setPodcastAudioSrc(
        proxiedObjectCdnUrl({
          name: podcast.extra.metadata?.title ?? undefined,
          mimeType,
          objectUrl,
        }),
      );
    }
  }, [podcast]);

  const copyShareLink = useCallback(() => {
    const url = new URL(window.location.origin + pathname);
    const currentParams = new URLSearchParams(window.location.search);
    const utmSource = currentParams.get("utm_source") || "podcast";
    const utmMedium = currentParams.get("utm_medium") || "share";
    url.searchParams.set("utm_source", utmSource);
    url.searchParams.set("utm_medium", utmMedium);
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast.success(t("linkCopied"));
    });
  }, [pathname, t]);

  const handleDownload = useCallback(() => {
    if (!podcastAudioSrc) return;
    window.open(podcastAudioSrc, "_blank");
  }, [podcastAudioSrc]);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <SharePageHeader copyShareLink={copyShareLink} onDownload={handleDownload} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-64">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12 space-y-6">
          {/* Podcast Cover Image */}
          {coverCdnHttpUrl && (
            <Link
              href={`/study/${studyUserChatToken}/share?reply=1`}
              target="_blank"
              className="block w-full max-w-lg mx-auto"
            >
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer">
                <Image
                  loader={({ src }) => src}
                  src={coverCdnHttpUrl}
                  alt="Podcast cover"
                  fill
                  className="object-cover"
                />
              </div>
            </Link>
          )}

          {/* Podcast Script */}
          {podcast.script && (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {podcast.script}
              </div>
            </div>
          )}

          {/* Fallback: Show title if no content */}
          {!podcast.script && !coverCdnHttpUrl && (
            <h1 className="text-xl sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-zinc-50 leading-tight text-center">
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Sticky Player with links */}
      <div className="shrink-0 absolute bottom-0 left-0 w-full">
        <StickyPlayer
          podcastAudioSrc={podcastAudioSrc}
          title={title}
          studyReplayUrl={`/study/${studyUserChatToken}/share?replay=1`}
          moreInsightRadioUrl="/insight-radio"
          autoPlay={true}
        />
      </div>
    </div>
  );
}
