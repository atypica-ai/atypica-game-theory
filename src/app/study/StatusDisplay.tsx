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
import { cn } from "@/lib/utils";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

export function CancelButton({
  onUserCancel,
  className,
}: {
  onUserCancel?: () => void;
  className?: string;
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "bg-transparent hover:bg-transparent transition-opacity opacity-100 hover:opacity-70",
          "flex items-center justify-center rounded-full size-4",
          !isAborting && "border-2 border-foreground/60",
          className,
        )}
        onClick={() => setDialogOpen(true)}
        disabled={isAborting}
      >
        {isAborting ? (
          <Loader2Icon className="size-full text-muted-foreground animate-spin" />
        ) : (
          <div className="w-2/5 h-2/5 bg-foreground/60" />
        )}
      </Button>

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
  // onUserCancel,
}: {
  status: "background" | "error" | "submitted" | "streaming" | "ready";
  onUserCancel?: () => void;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "background":
        return t("background");
      case "streaming":
        return t("thinking");
      case "submitted":
        return t("processing");
      case "complete":
        return t("complete");
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
    <div className="flex gap-2 justify-center items-center text-primary">
      {(status === "streaming" || status === "background") && (
        <div className="flex gap-1">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      )}
      <span className="text-xs tracking-wider font-medium">{getStatusMessage(status)}</span>
      {status === "error" && (
        <div
          className="p-1 hover:opacity-70 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <RefreshCcwIcon className="size-4" />
        </div>
      )}
      {/* {(status === "streaming" || status === "background") && (
        <CancelButton onUserCancel={onUserCancel} />
      )} */}
    </div>
  );
}
