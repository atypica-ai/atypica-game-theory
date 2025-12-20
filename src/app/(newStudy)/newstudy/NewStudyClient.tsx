"use client";
import { NewStudyInputBox } from "@/app/(newStudy)/components/NewStudyInputBox";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { trackEvent } from "@/lib/analytics/segment";
import { CommandIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import "./style.css";

export function NewStudyClient({ initialBrief }: { initialBrief?: string }) {
  const t = useTranslations("StudyPage.NewStudy");

  useEffect(() => {
    trackEvent("New Study Viewed");
  }, []);

  return (
    <FitToViewport className="hero-grid">
      <div className="relative w-2xl max-w-full mx-auto px-4 py-12 sm:py-40">
        <div className="w-full flex items-center justify-center gap-2 mb-8 text-2xl font-medium">
          <CommandIcon className="size-6" />
          <span>{t("startYourStudy")}</span>
        </div>
        <div className="w-full">
          <NewStudyInputBox initialBrief={initialBrief} />
        </div>
        <div className="mt-8 text-center text-sm">
          <Link
            prefetch={true}
            href="/featured-studies"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("viewFeaturedStudies")}
          </Link>
          <span className="mx-2 text-muted-foreground">{t("or")}</span>
          <Link
            prefetch={true}
            href="/studies"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("viewMyProjects")}
          </Link>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">{t("newStudyHint")}</div>
      </div>
    </FitToViewport>
  );
}
