"use client";
import { NewStudyInputBox } from "@/app/(newStudy)/components/NewStudyInputBox";
import { trackEvent } from "@/lib/analytics/segment";
import { CommandIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShortcutsGrid } from "./components/ShortcutsGrid";
import "./style.css";

export function NewStudyClient({ initialBrief }: { initialBrief?: string }) {
  const t = useTranslations("StudyPage.NewStudy");
  const [brief, setBrief] = useState(initialBrief || "");
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);

  useEffect(() => {
    trackEvent("New Study Viewed");
  }, []);

  const handleShortcutClick = (description: string, templateId?: number) => {
    setBrief(description);
    setTemplateId(templateId);
    // Scroll the FitToViewport container to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="hero-grid">
      <div className="relative w-2xl max-w-full mx-auto px-4 py-4">
        <div className="w-full flex items-center justify-center gap-2 mb-8 mt-12 sm:mt-24 text-2xl font-medium">
          <CommandIcon className="size-6" />
          <span>{t("startYourStudy")}</span>
        </div>
        <div className="w-full">
          <NewStudyInputBox initialBrief={brief} templateId={templateId} />
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
      {/* Shortcuts Grid */}
      <div className="mt-16 container px-4 mx-auto mb-12 sm:mb-32">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px flex-1 bg-border max-w-24" />
          <h2 className="text-lg font-medium text-center whitespace-nowrap">
            💡 {t("orStartFromScenarios")}
          </h2>
          <div className="h-px flex-1 bg-border max-w-24" />
        </div>
        <ShortcutsGrid onShortcutClick={handleShortcutClick} />
        <div className="mt-8 text-center text-xs text-muted-foreground/60">
          {t("shortcutsCuratedBy")}
        </div>
      </div>
    </div>
  );
}
