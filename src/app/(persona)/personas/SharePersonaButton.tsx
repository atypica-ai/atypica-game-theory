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
import { ClipboardCopyIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function SharePersonaButton({ persona }: { persona: { token: string } }) {
  const t = useTranslations("PersonaImport.SharePersonaButton");
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(`${window.location.origin}/personas/${persona.token}/share`);
  }, [persona.token]);
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("copySuccess"));
  }, [t, shareUrl]);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <ShareIcon className="size-3" />
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
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden break-words">
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
          <Button onClick={() => window.open(shareUrl, "_blank")}>{t("openButton")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
