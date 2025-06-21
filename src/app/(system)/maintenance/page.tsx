"use client";
import { checkMaintenanceStatus } from "@/app/admin/maintenance/actions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { WrenchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type TMaintenanceStatus = NonNullable<
  Awaited<ReturnType<typeof checkMaintenanceStatus>>
>["maintenanceData"];

export default function MaintenancePage() {
  // const { maintenanceData } = await checkMaintenanceStatus();
  const [maintenanceData, setMaintenanceData] = useState<TMaintenanceStatus | null>(null);
  // const t = await getTranslations("Maintenance");
  const t = useTranslations("Maintenance");
  const locale = useLocale();

  // 在前端取，前端渲染，以获得正确的时区
  useEffect(() => {
    checkMaintenanceStatus().then(({ maintenanceData }) => {
      setMaintenanceData(maintenanceData);
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
          <strong>{t("start")}</strong> {formatDate(maintenanceData.startTime, locale)}
        </p>
        <p className="text-muted-foreground">
          <strong>{t("expectedCompletion")}</strong> {formatDate(maintenanceData.endTime, locale)}
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">{t("tryAgain")}</Link>
      </Button>
    </div>
  ) : null;
}
