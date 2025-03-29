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
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function StatusDisplay({
  status,
  onAbort,
}: {
  status: "background" | "error" | "submitted" | "streaming" | "ready";
  onAbort?: () => void;
}) {
  const t = useTranslations("StudyPage.StatusDisplay");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
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
  const handleAbort = () => {
    setIsAborting(true);
    if (onAbort) onAbort();
    // Keep loading state for 5 seconds then refresh
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };

  return (
    <div className="flex gap-2 justify-center items-center text-primary">
      {status === "streaming" && (
        <div className="flex gap-1">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      )}
      <span className="text-xs tracking-wider font-medium">{getStatusMessage(status)}</span>
      {status === "background" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 bg-transparent hover:bg-transparent hover:text-foreground/70 transition-opacity opacity-70 hover:opacity-100"
            onClick={() => setDialogOpen(true)}
            disabled={isAborting}
          >
            {isAborting ? (
              <Loader2Icon className="size-4 text-muted-foreground animate-spin" />
            ) : (
              <XCircleIcon className="size-4 text-muted-foreground" />
            )}
          </Button>

          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmAbortTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("confirmAbortDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="text-xs text-muted-foreground mt-2 mb-4">
                {t("continueInstructions")}
              </div>
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
      )}
    </div>
  );
}
