import { NewStudyInputBox } from "@/components/NewStudyInputBox";
import { CommandIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function NewStudyPageClient() {
  const t = useTranslations("StudyPage.NewStudy");
  return (
    <div className="w-2xl max-w-full mx-auto px-4 py-12 sm:py-40">
      <div className="w-full flex items-center justify-center gap-2 mb-8 text-2xl font-medium">
        <CommandIcon className="size-6" />
        <span>{t("startYourStudy")}</span>
      </div>
      <div className="w-full">
        <NewStudyInputBox />
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">{t("newStudyHint")}</div>
    </div>
  );
}
