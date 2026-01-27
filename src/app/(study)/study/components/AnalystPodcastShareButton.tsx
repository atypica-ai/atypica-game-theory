"use client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/segment";
import { ClipboardCopyIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function AnalystPodcastShareButton({
  podcastToken,
  children,
  title,
}: {
  podcastToken: string;
  children?: React.ReactNode;
  title?: string;
}) {
  const publicPodcastUrl = `/artifacts/podcast/${podcastToken}/share?utm_source=podcast&utm_medium=share`;
  const t = useTranslations("StudyPage.AnalystPodcastShareButton");
  const [open, setOpen] = useState(false);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    const fullUrl = `${window.location.origin}${publicPodcastUrl}`;
    setFullUrl(fullUrl);
  }, [publicPodcastUrl]);

  const handleCopyUrl = useCallback(() => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    toast.success(t("copySuccess"));
    trackEvent("Study Artifact Exported", { intent: "share", type: "podcast", url: fullUrl });
  }, [t, fullUrl]);

  const handleShareToX = useCallback(() => {
    if (!fullUrl) return;
    // 构造分享文本
    const shareText = title ? t("shareToXWithTitle", { title }) : t("shareToXDefault");
    // 构造 Twitter Intent URL
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
    // 在新标签页中打开
    window.open(twitterUrl, "_blank");
    // 追踪事件
    trackEvent("Study Artifact Exported", { intent: "share", type: "podcast", url: fullUrl });
  }, [t, title, fullUrl]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <PlayIcon size={16} /> {t("listenPodcast")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-2">{t("successMessage")}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-word">
              {fullUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon className="size-4" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("openInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button variant="outline" onClick={handleShareToX}>
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t("shareToX")}
          </Button>
          <Button
            onClick={() => {
              if (!fullUrl) return;
              window.open(fullUrl, "_blank");
              trackEvent("Study Artifact Exported", {
                intent: "visit",
                type: "podcast",
                url: fullUrl,
              });
            }}
          >
            <PlayIcon className="size-4" />
            {t("openButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
