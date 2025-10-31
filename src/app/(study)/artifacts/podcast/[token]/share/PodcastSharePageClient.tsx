"use client";
import { getPodcastAudioSignedUrl } from "@/app/(podcast)/actions";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { Analyst, UserChat } from "@/prisma/client";
import { DownloadIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ReportImage } from "./components/ReportImage";
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
  report,
}: {
  podcastToken: string;
  analyst: Pick<Analyst, "id" | "topic">;
  studyUserChat: Pick<UserChat, "token" | "title">;
  report?: {
    id: number;
    token: string;
    generatedAt: Date | null;
    extra: {
      coverObjectUrl?: string | null;
      [key: string]: unknown;
    };
  };
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
    const url = window.location.origin + pathname;
    navigator.clipboard.writeText(url).then(() => {
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
      <div className="flex-1 flex flex-col overflow-y-auto pb-32 sm:pb-20">
        {report ? (
          <>
            {/* Title above report */}
            <section className="container mx-auto px-4 sm:px-4 py-6 sm:py-4 md:py-6">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-xl sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-3 text-center">
                  {studyUserChat.title}
                </h1>
              </div>
            </section>

            {/* Report Image Section */}
            <section className="container mx-auto px-4 sm:px-4 py-6 sm:py-4">
              <div className="max-w-6xl mx-auto">
                <ReportImage reportToken={report.token} reportExtra={report.extra} />
              </div>
            </section>
          </>
        ) : (
          <section className="container mx-auto px-4 sm:px-4 py-8 sm:py-8 md:py-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-xl sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-3 text-center">
                {studyUserChat.title}
              </h1>
            </div>
          </section>
        )}
      </div>

      {/* Sticky Player with links */}
      <div className="fixed bottom-0 left-0 right-0">
        <StickyPlayer
          podcastToken={podcastToken}
          title={studyUserChat.title}
          studyReplayUrl={`/study/${studyUserChat.token}/share?replay=1`}
          moreInsightRadioUrl="/featured-podcasts"
        />
      </div>
    </div>
  );
}
