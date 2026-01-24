"use client";
import { cn, formatDate } from "@/lib/utils";
import { AlertCircleIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function MaintenanceNotification() {
  const t = useTranslations("Maintenance");
  const locale = useLocale();

  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    showNotification: boolean;
    isInMaintenance: boolean;
    maintenanceData: { startTime: string; endTime: string; message: string } | null;
  }>({
    showNotification: false,
    isInMaintenance: false,
    maintenanceData: null,
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch("/api/system/maintenance-status");
        if (response.ok) {
          const result = await response.json();
          setMaintenanceInfo(result);
        }
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
        setIsLoaded(true);
      }
    };

    checkMaintenance();
    // Set up periodic check every 5 minutes
    const interval = setInterval(checkMaintenance, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (
    !isLoaded ||
    !maintenanceInfo.showNotification ||
    isDismissed ||
    maintenanceInfo.isInMaintenance
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-amber-100/60 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100",
        "p-3 text-center flex items-center justify-center",
      )}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <AlertCircleIcon className="h-5 w-5 shrink-0" />
        <p className="text-sm">
          <span className="font-medium">{t("scheduledMaintenance")} </span>
          {maintenanceInfo.maintenanceData
            ? t("maintenancePeriod", {
                startTime: formatDate(new Date(maintenanceInfo.maintenanceData.startTime), locale),
                endTime: formatDate(new Date(maintenanceInfo.maintenanceData.endTime), locale),
              })
            : ""}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto bg-transparent hover:bg-amber-200 dark:hover:bg-amber-800 h-6 w-6 p-0 rounded-full"
          onClick={() => setIsDismissed(true)}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">{t("dismiss")}</span>
        </Button>
      </div>
    </div>
  );
}
