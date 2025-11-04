"use client";
import { getPodcastAudioSignedUrl } from "@/app/(podcast)/actions";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { proxiedImageLoader } from "@/lib/utils";
import { Analyst, UserChat } from "@/prisma/client";
import { DownloadIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
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
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyShareLink}>
          <Share2 size={14} />
          <span className="hidden sm:inline">{t("copyLink")}</span>
        </Button>
        {onDownload && (
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onDownload}>
            <DownloadIcon size={14} />
            <span className="hidden sm:inline">{t("download")}</span>
          </Button>
        )}
        {/*<UserTokensBalance />*/}
        <UserMenu />
      </div>
    </GlobalHeader>
  );
}

export default function PodcastSharePageClient({
  podcastToken,
  studyUserChat,
  script,
  coverImageUrl,
}: {
  podcastToken: string;
  analyst: Pick<Analyst, "id" | "topic">;
  studyUserChat: Pick<UserChat, "token" | "title">;
  script?: string;
  coverImageUrl?: string;
}) {
  const t = useTranslations("PodcastSharePage");
  const pathname = usePathname();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load audio URL for download
  useEffect(() => {
    const loadAudioUrl = async () => {
      const result = await getPodcastAudioSignedUrl({ podcastToken });
      if (result.success && result.data) {
        setAudioUrl(result.data);
      }
    };
    loadAudioUrl();
  }, [podcastToken]);

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
    if (!audioUrl) return;
    window.open(audioUrl, "_blank");
  }, [audioUrl]);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <SharePageHeader copyShareLink={copyShareLink} onDownload={handleDownload} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-64">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12 space-y-6">
          {/* Report Cover Image */}
          {coverImageUrl && (
            <div className="relative w-full max-w-lg mx-auto aspect-[16/9] bg-muted rounded-lg overflow-hidden">
              <Image
                src={coverImageUrl}
                alt="Report Cover"
                fill
                sizes="100%"
                className="object-cover"
                loader={proxiedImageLoader}
              />
            </div>
          )}

          {/* Podcast Script */}
          {script && (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {script}
              </div>
            </div>
          )}

          {/* Fallback: Show title if no content */}
          {!script && !coverImageUrl && (
            <h1 className="text-xl sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-zinc-50 leading-tight text-center">
              {studyUserChat.title}
            </h1>
          )}
        </div>
      </div>

      {/* Sticky Player with links */}
      <div className="shrink-0 absolute bottom-0 left-0 w-full">
        <StickyPlayer
          podcastToken={podcastToken}
          title={studyUserChat.title}
          studyReplayUrl={`/study/${studyUserChat.token}/share?replay=1`}
          moreInsightRadioUrl="/featured-podcasts"
          autoPlay={true}
        />
      </div>
    </div>
  );
}
