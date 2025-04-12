"use client";
import { checkMaintenanceStatus } from "@/app/admin/maintenance/actions";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function MaintenanceNotification() {
  const t = useTranslations("Maintenance");

  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    showNotification: boolean;
    isInMaintenance: boolean;
    maintenanceData: { startTime: Date; endTime: Date; message: string } | null;
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
        const result = await checkMaintenanceStatus();
        setMaintenanceInfo(result);
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100",
        "p-3 text-center shadow-md flex items-center justify-center",
      )}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">{t("scheduledMaintenance")} </span>
          {maintenanceInfo.maintenanceData
            ? t("maintenancePeriod", {
                startTime: formatDate(maintenanceInfo.maintenanceData.startTime),
                endTime: formatDate(maintenanceInfo.maintenanceData.endTime),
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
