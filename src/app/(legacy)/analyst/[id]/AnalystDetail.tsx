"use client";
import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Analyst } from "@/prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalystInterviewsSection } from "./AnalystInterviewsSection";
import { AnalystReportsSection } from "./AnalystReportsSection";
import { fetchAnalystReports } from "./actions";

type AnalystInterview = ExtractServerActionData<typeof fetchAnalystInterviews>[number];
type AnalystReport = ExtractServerActionData<typeof fetchAnalystReports>[number];

export function AnalystDetail({
  analyst,
  interviews,
  reports,
}: {
  analyst: Analyst;
  interviews: AnalystInterview[];
  reports: AnalystReport[];
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);

  // Poll for status
  useEffect(() => {
    const check = async () => {
      router.refresh();
    };
    const intervalId = setInterval(check, 5000);
    return () => clearInterval(intervalId);
  }, [router, analyst.id]);

  return (
    <div className="flex-1 w-full overflow-y-auto scrollbar-thin px-3 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 container mx-auto">
        <section className="col-span-1 space-y-8">
          <div className="relative w-full">
            <h1 className="text-center text-xl font-medium mb-4">{analyst.role}</h1>
          </div>

          <div className="bg-accent/40 rounded-lg p-6 border">
            <div className="flex items-start max-lg:flex-col gap-3">
              <div className="shrink-0 rounded-md bg-background size-10 flex items-center justify-center text-xl border">
                📝
              </div>
              <div className="flex-1">
                <div className="text-base font-medium mb-1">{t("topicCard.researchTopic")}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {analyst.topic}
                </div>
                <div className="mt-4 text-xs text-muted-foreground whitespace-pre-wrap rounded-md border p-4 max-h-40 overflow-y-auto scrollbar-thin">
                  {analyst.brief}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>💡 {t("guide.title")}</p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>{t("guide.tip1")}</li>
              <li>{t("guide.tip2")}</li>
              <li>{t("guide.tip3")}</li>
            </ul>
          </div>
        </section>

        <section className="col-span-2 space-y-8">
          <AnalystReportsSection analystId={analyst.id} reports={reports} />

          <AnalystInterviewsSection
            analystId={analyst.id}
            interviews={interviews}
            isPersonaDialogOpen={isPersonaDialogOpen}
            setIsPersonaDialogOpen={setIsPersonaDialogOpen}
          />
        </section>
      </div>
    </div>
  );
}
