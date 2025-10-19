import { fetchAnalystInterviews, upsertAnalystInterview } from "@/app/(agents)/interview/actions";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { InterviewCard } from "./InterviewCard";
import { batchBackgroundInterview } from "./actions";

type AnalystInterview = ExtractServerActionData<typeof fetchAnalystInterviews>[number];

export function AnalystInterviewsSection({
  analystId,
  interviews,
  isPersonaDialogOpen,
  setIsPersonaDialogOpen,
}: {
  analystId: number;
  interviews: AnalystInterview[];
  isPersonaDialogOpen: boolean;
  setIsPersonaDialogOpen: (open: boolean) => void;
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();

  const addPersona = useCallback(() => {
    setIsPersonaDialogOpen(true);
  }, [setIsPersonaDialogOpen]);

  const onSelectPersonas = useCallback(
    async (personaTokens: string[]) => {
      for (const personaToken of personaTokens) {
        await upsertAnalystInterview({ analystId, personaToken });
      }
      router.refresh();
    },
    [analystId, router],
  );

  const pendingCount = interviews.filter(
    (i) => !i.conclusion && !i.interviewUserChat?.backgroundToken,
  ).length;

  return (
    <>
      <div className="flex items-end justify-start flex-wrap gap-4 mb-4 mx-auto container">
        <h2 className="text-lg font-medium m-0">{t("interviewSection.title")}</h2>
        <div className="ml-auto" />
        <div className="flex items-center justify-end flex-wrap gap-4">
          <TokenAlertDialog
            value={pendingCount * 10000}
            onConfirm={async () => {
              const pending = interviews.filter(
                (i) => !i.conclusion && !i.interviewUserChat?.backgroundToken,
              );
              await batchBackgroundInterview({
                analystId,
                personaIds: pending.map((i) => i.persona.id),
              });
              router.refresh();
            }}
          >
            <Button variant="default" size="sm" disabled={pendingCount === 0}>
              {t("interviewSection.startAllInterviews")} ({pendingCount})
            </Button>
          </TokenAlertDialog>
          <Button variant="outline" size="sm" onClick={addPersona}>
            <PlusIcon /> {t("interviewSection.addInterviewPersona")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mx-auto container">
        {interviews.map((interview) => (
          <InterviewCard key={interview.id} interview={interview} />
        ))}
      </div>

      <SelectPersonaDialog
        open={isPersonaDialogOpen}
        onOpenChange={setIsPersonaDialogOpen}
        onSelect={onSelectPersonas}
      />
    </>
  );
}
