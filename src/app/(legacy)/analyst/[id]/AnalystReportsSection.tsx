import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { backgroundGenerateReport, fetchAnalystReports } from "./actions";

type AnalystReport = ExtractServerActionData<typeof fetchAnalystReports>[number];

export function AnalystReportsSection({
  analystId,
  reports,
}: {
  analystId: number;
  reports: AnalystReport[];
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<AnalystReport | null>(null);

  const generateReport = useCallback(async () => {
    try {
      await backgroundGenerateReport({ analystId });
      router.refresh();
    } catch (error) {
      toast.error(`${error}`);
    }
  }, [analystId, router]);

  return (
    <div className="mx-auto container">
      <div className="mt-4 flex justify-start flex-wrap gap-4">
        <div className="text-lg font-medium mb-4">Reports</div>
        <TokenAlertDialog value={100000} onConfirm={generateReport}>
          <Button variant="default" size="sm">
            {t("topicCard.generateReport")}
          </Button>
        </TokenAlertDialog>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/artifacts/report/${report.token}/raw`}
            target="_blank"
            className="w-full block"
            onClick={(e) => {
              if (!report.generatedAt) {
                e.preventDefault();
                setIsReportDialogOpen(report);
              }
            }}
          >
            <div
              className="block w-full aspect-[2/1] cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-accent/10 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: report.coverSvg }}
            ></div>
            <div className="mt-1 ml-1 font-mono text-xs text-muted-foreground flex items-center justify-between">
              <span>{formatDistanceToNow(report.createdAt)}</span>
              {!report.generatedAt && (
                <Loader2Icon className="size-4 animate-spin text-amber-500" />
              )}
            </div>
          </Link>
        ))}
      </div>

      <Dialog
        open={!!isReportDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReportDialogOpen(null);
          }
        }}
        modal
      >
        <DialogContent className="sm:max-w-[80vw]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Generating report</DialogTitle>
          </DialogHeader>
          {isReportDialogOpen && (
            <div className="h-[70vh]">
              <iframe
                src={`/artifacts/report/${isReportDialogOpen.token}/raw?live=1`}
                className="w-full h-full border-none"
              ></iframe>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
