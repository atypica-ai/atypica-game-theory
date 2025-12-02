"use client";

import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, AlertTriangleIcon, Loader2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function SageStatusBar() {
  const { status, sage } = useSageContext();
  const t = useTranslations("Sage.StatusBar");
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show anything if status is ready or user dismissed it
  if (status === "ready" || isDismissed) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "processing":
        return {
          icon: <Loader2Icon className="size-4 animate-spin" />,
          variant: "default" as const,
          title: t("processing"),
          description: t("processingDesc"),
          canDismiss: false,
        };
      case "error":
        return {
          icon: <AlertCircleIcon className="size-4" />,
          variant: "destructive" as const,
          title: t("error"),
          description: sage.extra.error || t("errorDesc"),
          canDismiss: true,
        };
      case "timeout":
        return {
          icon: <AlertTriangleIcon className="size-4" />,
          variant: "destructive" as const,
          title: t("timeout"),
          description: t("timeoutDesc"),
          canDismiss: true,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 border-t border-border px-4 py-3",
        " bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10",
      )}
    >
      <Alert variant={config.variant} className="relative">
        {config.icon}
        <div>
          <div className="font-medium text-sm">{config.title}</div>
          <AlertDescription className="text-xs mt-1">{config.description}</AlertDescription>
        </div>
        {(config.canDismiss || true) && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 absolute top-1 right-1"
            onClick={() => setIsDismissed(true)}
          >
            <XIcon className="size-3" />
          </Button>
        )}
      </Alert>
    </div>
  );
}
