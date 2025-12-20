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
import { ClipboardCopyIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function ShareInterviewProjectButton({
  interviewProject,
}: {
  interviewProject: { id: number; token: string };
}) {
  const t = useTranslations("InterviewProject.ShareInterviewProjectButton");
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(`${window.location.origin}/interview/project/${interviewProject.token}/share`);
  }, [interviewProject.token]);
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("copySuccess"));
    trackEvent("Interview Invitation Shared", { projectId: interviewProject.id });
  }, [t, shareUrl, interviewProject.id]);
  const handleOpenUrl = useCallback(() => {
    trackEvent("Interview Invitation Shared", { projectId: interviewProject.id });
    window.open(shareUrl, "_blank");
  }, [shareUrl, interviewProject.id]);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs rounded-full shadow-none">
          <ShareIcon className="size-3" />
          <span className="max-sm:hidden">{t("shareProject")}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 overflow-hidden">
          <p className="text-sm text-muted-foreground">{t("shareTipMessage")}</p>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-word">
              {shareUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon className="size-4" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("openInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button onClick={handleOpenUrl}>{t("openButton")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
