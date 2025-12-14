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
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function AnalystPodcastShareButton({
  podcastToken,
  children,
}: {
  podcastToken: string;
  children?: React.ReactNode;
}) {
  const publicPodcastUrl = `/artifacts/podcast/${podcastToken}/share?utm_source=podcast&utm_medium=share`;
  const t = useTranslations("StudyPage.AnalystPodcastShareButton");
  const [open, setOpen] = useState(false);
  const fullUrl = `${window.location.origin}${publicPodcastUrl}`;

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(fullUrl);
    toast.success(t("copySuccess"));
    trackEvent("Study Artifact Exported", { intent: "share", type: "podcast", url: fullUrl });
  }, [t, fullUrl]);

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
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-words">
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
          <Button
            onClick={() => {
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
