"use client";
import { NewStudyInputBox } from "@/app/(newStudy)/components/NewStudyInputBox";
import { trackEvent } from "@/lib/analytics/segment";
import { ArrowRightIcon, CommandIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShortcutsGrid } from "../components/ShortcutsGrid";
import "./style.css";

export function NewStudyClient({ initialBrief }: { initialBrief?: string }) {
  const t = useTranslations("StudyPage.NewStudy");
  const tHp = useTranslations("MemoryBuilder.hp");
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
    <div className="hero-grid px-4">
      <div className="relative w-2xl max-w-full mx-auto py-4">
        {/* Personal profile CTA */}
        <Link
          href="/user/memory-builder"
          className="group flex items-center gap-4 py-3 px-4 mt-4 sm:mt-8 mb-8 sm:mb-16 rounded-lg bg-zinc-100 dark:bg-zinc-800"
        >
          <span className="size-1.5 rounded-full bg-ghost-green shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{tHp("title")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{tHp("description")}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap group-hover:text-foreground group-hover:font-medium">
            {tHp("cta")}
            <ArrowRightIcon className="size-3.5" />
          </div>
        </Link>

        <div className="w-full flex items-center justify-center gap-2 mb-8 mt-8 text-2xl font-medium">
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
      <div className="mt-10 mx-auto max-w-6xl mb-12 sm:mb-32">
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
