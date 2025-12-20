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
import { cn } from "@/lib/utils";
import { ClipboardCopyIcon, Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function SageShareButton({
  sageToken,
  children,
  variant = "ghost",
  size = "sm",
  className,
}: {
  sageToken: string;
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const publicSageUrl = `/sage/profile/${sageToken}`;
  const t = useTranslations("Sage.SageShareButton");
  const [open, setOpen] = useState(false);
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${publicSageUrl}` : "";

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(fullUrl);
    toast.success(t("copySuccess"));
    trackEvent("Sage Profile Shared", { intent: "share", url: fullUrl });
  }, [t, fullUrl]);

  const handleOpenUrl = useCallback(() => {
    window.open(fullUrl, "_blank");
    trackEvent("Sage Profile Shared", { intent: "visit", url: fullUrl });
  }, [fullUrl]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant={variant} size={size} className={cn(className)}>
            <Share2Icon className="size-3" />
            {t("shareButton")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-2">{t("description")}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-word">
              {fullUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon className="size-4" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("shareInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button onClick={handleOpenUrl}>{t("openButton")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
