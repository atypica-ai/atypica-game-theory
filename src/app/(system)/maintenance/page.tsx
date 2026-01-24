"use client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { WrenchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type TMaintenanceData = {
  startTime: string;
  endTime: string;
  message: string;
} | null;

export default function MaintenancePage() {
  const [maintenanceData, setMaintenanceData] = useState<TMaintenanceData>(null);
  const t = useTranslations("Maintenance");
  const locale = useLocale();

  // 在前端取，前端渲染，以获得正确的时区
  useEffect(() => {
    fetch("/api/system/maintenance-status")
      .then((res) => res.json())
      .then(({ maintenanceData }) => {
        if (maintenanceData) {
          setMaintenanceData(maintenanceData);
        } else {
          window.location.replace("/"); // Redirect to homepage if no maintenance data is found
        }
      })
      .catch((error) => {
        console.error("Failed to fetch maintenance status:", error);
      });
  }, []);

  // if (!maintenanceData) {
  //   return <div className="text-center py-10">Redirecting to homepage...</div>;
  // }

  return maintenanceData ? (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-5 max-w-md mx-auto text-center">
      <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-full mb-8">
        <WrenchIcon className="h-16 w-16 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tighter mb-3">{t("title")}</h1>
      <p className="text-muted-foreground mb-8">{maintenanceData.message || t("description")}</p>
      <div className="mb-8 text-sm border rounded-md p-4 bg-muted/20">
        <p className="text-muted-foreground">
          <strong>{t("start")}</strong> {formatDate(new Date(maintenanceData.startTime), locale)}
        </p>
        <p className="text-muted-foreground">
          <strong>{t("expectedCompletion")}</strong>{" "}
          {formatDate(new Date(maintenanceData.endTime), locale)}
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">{t("tryAgain")}</Link>
      </Button>
    </div>
  ) : null;
}
