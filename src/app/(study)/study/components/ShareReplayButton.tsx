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
import { UserChat } from "@/prisma/client";
import { ClipboardCopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Custom Share Icon
const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export function ShareReplayButton({
  studyUserChat,
}: {
  studyUserChat: Pick<UserChat, "id" | "token"> & { kind: "study" };
}) {
  const t = useTranslations("StudyPage.ShareReplayButton");
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(`${window.location.origin}/study/${studyUserChat.token}/share?replay=1`);
  }, [studyUserChat.token]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("copySuccess"));
    trackEvent("Study Artifact Exported", { intent: "share", type: "replay", url: shareUrl });
  }, [t, shareUrl]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 has-[>svg]:px-2 gap-1.5 hover:bg-transparent hover:text-primary text-xs"
        >
          <ShareIcon className="size-4" />
          <span className="max-sm:hidden">{t("shareReplay")}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-3 space-y-3 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-2">{t("shareTipMessage")}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-word">
              {shareUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon className="size-4 mr-1" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("openInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button
            onClick={() => {
              window.open(shareUrl, "_blank");
              trackEvent("Study Artifact Exported", {
                intent: "visit",
                type: "replay",
                url: shareUrl,
              });
            }}
          >
            {t("openButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
