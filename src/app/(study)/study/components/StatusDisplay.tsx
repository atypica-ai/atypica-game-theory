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

/**
 * Compact status indicator for textarea bottom-left corner.
 * Shows only during active/error states, hidden when ready.
 */
export function CompactStatus({
  status,
  startedAt,
  errorMessage,
}: {
  status:
    | "background"
    | "streaming"
    | "submitted"
    | "outOfQuota"
    | "waitForUser"
    | "error"
    | "ready";
  startedAt?: Date | null;
  errorMessage: string | null;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === "background" && startedAt) {
      const startTime = startedAt.getTime();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startedAt]);

  if (status === "ready") return null;

  if (status === "error") {
    const isNetworkError = errorMessage && /network|load|加载|网络/i.test(errorMessage);
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
        <span className="text-destructive truncate">
          {isNetworkError ? t("networkError") : errorMessage}
        </span>
        <button
          className="text-muted-foreground font-medium hover:underline cursor-pointer shrink-0"
          onClick={() => window.location.reload()}
        >
          {t("reload")}
        </button>
      </div>
    );
  }

  if (status === "outOfQuota") {
    return (
      <div className="flex gap-1.5 text-xs">
        <CoinsIcon className="size-3 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="text-foreground font-medium">{t("outOfQuota")}</span>
          <span className="hidden sm:inline text-muted-foreground">·</span>
          <Link
            href="/pricing"
            prefetch
            className="text-foreground font-medium hover:underline"
          >
            {t("addMoreTokens")} ›
          </Link>
        </div>
      </div>
    );
  }

  const label =
    status === "background"
      ? t("background")
      : status === "streaming"
        ? t("thinking")
        : status === "submitted"
          ? t("processing")
          : status === "waitForUser"
            ? t("waitForUser")
            : "";

  return (
    <div className="flex items-center gap-1.5 text-xs text-foreground/70 font-medium">
      <span className="size-1.5 shrink-0 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse" />
      <span className="truncate">{label}</span>
      {status === "background" && elapsedTime > 0 && (
        <span className="font-mono shrink-0">{formatDuration(elapsedTime)}</span>
      )}
      {(status === "streaming" || status === "background" || status === "submitted") && (
        <span className="flex gap-0.5 shrink-0">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </span>
      )}
    </div>
  );
}

export function StatusDisplay({
  status,
  startedAt,
  errorMessage,
}: {
  status:
    | "background"
    | "streaming"
    | "submitted"
    | "outOfQuota"
    | "waitForUser"
    | "error"
    | "ready";
  startedAt?: Date | null;
  errorMessage: string | null;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time when in background status
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === "background" && startedAt) {
      const startTime = startedAt.getTime();
      // Update elapsed seconds every second
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      // Initial calculation
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startedAt]);

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
        // return t("error");
        return null; // 不显示文本，直接显示重试按钮
      case "ready":
        return t("ready");
      default:
        return "";
    }
  };

  if (!status) return null;

  return status === "error" ? (
    <div className="flex flex-col items-center justify-center gap-2">
      {errorMessage && /network|load|加载|网络/i.test(errorMessage) ? (
        <div className="text-xs text-muted-foreground">{t("networkError")}</div>
      ) : (
        <div className="text-xs mx-32 line-clamp-2 text-destructive max-h-8 leading-4 text-center">
          {errorMessage}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="h-7 text-xs"
        onClick={() => window.location.reload()}
      >
        <RefreshCcwIcon className="size-3.5" />
        {t("reload")}
      </Button>
    </div>
  ) : (
    <div
      className={cn(
        "px-4 py-2 rounded-full shadow bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/90",
        "flex flex-wrap items-center gap-2 text-primary",
      )}
    >
      <div className="text-xs tracking-wider font-medium">{getStatusMessage(status)}</div>
      {status === "outOfQuota" && (
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link href="/pricing" prefetch>
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
    </div>
  );
}
