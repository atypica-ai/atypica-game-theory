import { checkMaintenanceStatus } from "@/app/admin/maintenance/actions";
import { Button } from "@/components/ui/button";
import { WrenchIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function MaintenancePage() {
  const { maintenanceData } = await checkMaintenanceStatus();
  const t = await getTranslations("Maintenance");

  if (!maintenanceData) {
    // If there's no maintenance scheduled, redirect to home
    return <div className="text-center py-10">Redirecting to homepage...</div>;
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-5 max-w-md mx-auto text-center">
      <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-full mb-8">
        <WrenchIcon className="h-16 w-16 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tighter mb-3">{t("title")}</h1>
      <p className="text-muted-foreground mb-8">{maintenanceData.message || t("description")}</p>
      <div className="mb-8 text-sm border rounded-md p-4 bg-muted/20">
        <p className="text-muted-foreground">
          <strong>{t("start")}</strong> {formatDate(maintenanceData.startTime)}
        </p>
        <p className="text-muted-foreground">
          <strong>{t("expectedCompletion")}</strong> {formatDate(maintenanceData.endTime)}
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">{t("tryAgain")}</Link>
      </Button>
    </div>
  );
}
