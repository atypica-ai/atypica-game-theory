"use client";

import { fetchStudyPanelInfo } from "@/app/(study)/study/actions";
import { ArrowRightIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function StudyPanelCTA({ panelId }: { panelId: number }) {
  const t = useTranslations("StudyPage.BottomBar");

  const [panelInfo, setPanelInfo] = useState<{
    panelId: number;
    personaCount: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchStudyPanelInfo(panelId).then((result) => {
      if (result.success) {
        setPanelInfo(result.data);
      }
    });
  }, [panelId]);

  if (!panelInfo || panelInfo.personaCount === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <div className="size-1 rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground font-medium">{t("goToPanel")}</span>
      </div>

      <Link href={`/panel/${panelInfo.panelId}`} className="block group">
        <div className="border border-border/60 rounded-md p-4 transition-colors group-hover:border-border">
          <div className="flex items-start gap-3">
            <UsersIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {t("panelTitle", { count: panelInfo.personaCount })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t("panelDescription")}</div>
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
          </div>
        </div>
      </Link>
    </div>
  );
}
