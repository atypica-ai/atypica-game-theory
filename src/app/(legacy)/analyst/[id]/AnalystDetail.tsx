"use client";
import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Analyst } from "@prisma/client";
import { Link, PlusIcon, UndoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InterviewCard } from "./InterviewCard";
import { ReportDialog } from "./ReportDialog";
import { SelectPersonaDialog } from "./SelectPersonaDialog";

type AnalystInterview = ExtractServerActionData<typeof fetchAnalystInterviews>[number];

export function AnalystDetail({
  analyst,
  interviews,
}: {
  analyst: Analyst;
  interviews: AnalystInterview[];
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Poll for status
  useEffect(() => {
    const check = async () => {
      router.refresh();
    };
    const intervalId = setInterval(check, 5000);
    return () => clearInterval(intervalId);
  }, [router, analyst.id]);

  const addPersona = () => {
    setIsOpen(true);
  };

  const generateReport = useCallback(async () => {
    try {
      // await updateAnalyst(analyst.id, { report: "" });
      router.refresh();
      setIsReportOpen(true);
    } catch (error) {
      toast.error(`${error}`);
      throw error;
    }
  }, [router]);

  const tokensDialog = useMemo(() => {
    const pendingCount = interviews.filter(
      (i) => !i.conclusion && !i.interviewUserChat?.backgroundToken,
    ).length;
    return (
      <TokenAlertDialog
        value={pendingCount * 5}
        onConfirm={async () => {
          const pending = interviews.filter(
            (i) => !i.conclusion && !i.interviewUserChat?.backgroundToken,
          );
          for (const interview of pending) {
            await fetch("/api/chat/interview/background", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                analystId: analyst.id,
                personaId: interview.persona.id,
              }),
            });
          }
          router.refresh();
        }}
      >
        <Button variant="default" size="sm" disabled={pendingCount === 0}>
          {t("interviewSection.startAllInterviews")} ({pendingCount})
        </Button>
      </TokenAlertDialog>
    );
  }, [analyst, interviews, router, t]);

  return (
    <div className="flex-1 w-full overflow-y-auto scrollbar-thin py-12 space-y-8">
      <div className="relative w-full">
        <h1 className="text-center text-xl font-medium mb-4">{analyst.role}</h1>
      </div>

      <div className="bg-accent/40 rounded-lg p-6 border mx-auto max-w-4xl">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-background p-2 border">📝</div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">{t("topicCard.researchTopic")}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {analyst.topic}
            </p>
            <div className="mt-4 flex justify-end flex-wrap gap-4">
              {/* {analyst.report ? ( */}
              {false ? (
                <>
                  <Button asChild variant="default" size="sm">
                    <Link href={`/analyst/${analyst.id}/html`} target="_blank">
                      {t("topicCard.viewReport")}
                    </Link>
                  </Button>

                  <TokenAlertDialog value={100} onConfirm={generateReport}>
                    <Button variant="outline" size="sm">
                      <UndoIcon /> {t("topicCard.regenerateReport")}
                    </Button>
                  </TokenAlertDialog>
                </>
              ) : (
                <TokenAlertDialog value={100} onConfirm={generateReport}>
                  <Button variant="default" size="sm">
                    {t("topicCard.generateReport")}
                  </Button>
                </TokenAlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground  mx-auto max-w-4xl">
        <p>💡 {t("guide.title")}</p>
        <ul className="list-disc ml-4 mt-1 space-y-1">
          <li>{t("guide.tip1")}</li>
          <li>{t("guide.tip2")}</li>
          <li>{t("guide.tip3")}</li>
        </ul>
      </div>

      <div className="flex items-end justify-start flex-wrap gap-4 mb-4 mx-auto max-w-4xl">
        <h2 className="text-lg font-medium m-0">{t("interviewSection.title")}</h2>
        <div className="ml-auto" />
        <div className="flex items-center justify-end flex-wrap gap-4">
          {tokensDialog}
          <Button variant="outline" size="sm" onClick={addPersona}>
            <PlusIcon /> {t("interviewSection.addInterviewSubject")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mx-auto max-w-4xl">
        {interviews.map((interview) => (
          <InterviewCard key={interview.id} interview={interview} />
        ))}
      </div>

      <SelectPersonaDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        analystId={analyst.id}
        onSuccess={() => router.refresh()}
      />
      <ReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} analystId={analyst.id} />
    </div>
  );
}
