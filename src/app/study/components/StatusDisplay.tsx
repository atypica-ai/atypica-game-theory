"use client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn, formatDuration } from "@/lib/utils";
import { CoinsIcon, Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function CancelButton({
  onUserCancel,
  className,
  showEvictionWarning = false,
}: {
  onUserCancel?: () => void;
  className?: string;
  showEvictionWarning?: boolean;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

  const handleAbort = useCallback(() => {
    setIsAborting(true);
    if (onUserCancel) onUserCancel();
    // Keep loading state for 1 second
    setTimeout(() => {
      setIsAborting(false);
    }, 1000);
  }, [onUserCancel]);

  return (
    <>
      <div className="relative">
        {showEvictionWarning && (
          <div className="absolute bottom-0 right-full mr-2 w-max max-w-64 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 text-xs p-2 rounded border border-input/50">
            <div className="relative">
              <div className="text-center font-medium">{t("evictionWarningTitle")}</div>
              <div className="mt-1">{t("evictionWarningMessage")}</div>
            </div>
            <div className="absolute w-2 h-2 bg-yellow-100 dark:bg-yellow-900 transform rotate-45 -right-1 bottom-2 border-t border-r border-input/50"></div>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "bg-transparent hover:bg-transparent transition-opacity opacity-100 hover:opacity-70",
            "flex items-center justify-center rounded-full size-4",
            !isAborting && "border-2 border-foreground/60",
            showEvictionWarning && "border-yellow-500 dark:border-yellow-400",
            className,
          )}
          onClick={() => setDialogOpen(true)}
          disabled={isAborting}
        >
          {isAborting ? (
            <Loader2Icon className="size-full text-muted-foreground animate-spin" />
          ) : (
            <div
              className={cn(
                "w-2/5 h-2/5",
                showEvictionWarning ? "bg-yellow-500 dark:bg-yellow-400" : "bg-foreground/60",
              )}
            />
          )}
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmAbortTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmAbortDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-xs text-muted-foreground mt-2 mb-4">{t("continueInstructions")}</div>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={isAborting}>{t("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleAbort}
              disabled={isAborting}
              className="sm:w-auto w-full"
            >
              {isAborting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t("aborting")}
                </>
              ) : (
                t("confirmAbort")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StatusDisplay({
  status,
  backgroundToken,
}: {
  status:
    | "background"
    | "streaming"
    | "submitted"
    | "outOfQuota"
    | "waitForUser"
    | "error"
    | "ready";
  backgroundToken: string | null;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time when in background status
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === "background" && backgroundToken) {
      const startTime = parseInt(backgroundToken, 10);
      if (!isNaN(startTime)) {
        // Update elapsed seconds every second
        interval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setElapsedTime(elapsed);
        }, 1000);
        // Initial calculation
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, backgroundToken]);

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "background":
        return t("background");
      case "streaming":
        return t("thinking");
      case "submitted":
        return t("processing");
      case "outOfQuota":
        return t("outOfQuota");
      case "waitForUser":
        return t("waitForUser");
      case "error":
        return t("error");
      case "ready":
        return t("ready");
      default:
        return "";
    }
  };

  if (!status) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 text-primary">
      <div className="text-xs tracking-wider font-medium">{getStatusMessage(status)}</div>
      {status === "outOfQuota" && (
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link href="/account">
            <CoinsIcon className="h-3.5 w-3.5 text-amber-500" />
            {t("addMoreTokens")}
          </Link>
        </Button>
      )}
      {status === "background" && elapsedTime > 0 && (
        <div className="text-xs">({formatDuration(elapsedTime)})</div>
      )}
      {(status === "streaming" || status === "background" || status === "submitted") && (
        <div className="flex gap-1 h-4">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      )}
      {status === "error" && (
        <div
          className="p-1 hover:opacity-70 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <RefreshCcwIcon className="size-4" />
        </div>
      )}
    </div>
  );
}
