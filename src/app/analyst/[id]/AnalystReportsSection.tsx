import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { Analyst } from "@/prisma/client";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { backgroundGenerateReport, fetchAnalystReports } from "./actions";

type AnalystReport = ExtractServerActionData<typeof fetchAnalystReports>[number];

export function AnalystReportsSection({
  analyst,
  reports,
  defaultReportHTMLSystem,
}: {
  analyst: Analyst;
  reports: AnalystReport[];
  defaultReportHTMLSystem: string;
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<AnalystReport | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  const openPromptDialog = useCallback(() => {
    setSystemPrompt(defaultReportHTMLSystem);
    setIsPromptDialogOpen(true);
  }, [defaultReportHTMLSystem]);

  const generateReport = useCallback(async () => {
    try {
      await backgroundGenerateReport({
        analystId: analyst.id,
        systemPrompt,
      });
      router.refresh();
    } catch (error) {
      toast.error(`${error}`);
    }
  }, [analyst.id, router, systemPrompt]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="text-lg font-medium">Reports</div>
        <Button variant="default" size="sm" onClick={openPromptDialog}>
          {t("topicCard.generateReport")}
        </Button>
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
            <div className="relative w-full aspect-video cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-accent/10">
              {report.coverCdnHttpUrl ? (
                <Image
                  src={report.coverCdnHttpUrl}
                  alt="Report cover"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"></div>
              )}
            </div>
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

      <Dialog open={isPromptDialogOpen} onOpenChange={(open) => setIsPromptDialogOpen(open)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customize Report Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-hidden">
            <Textarea
              placeholder="Enter custom instructions for the report generation. Leave blank to use default settings."
              className="min-h-[200px] max-h-[400px]"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Additional instructions will be passed to the AI when generating your report. These
              will supplement the standard report template.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPromptDialogOpen(false)}>
              Cancel
            </Button>
            <TokenAlertDialog
              value={100000}
              onConfirm={() => {
                generateReport();
                setIsPromptDialogOpen(false);
              }}
            >
              <Button variant="default">Generate Report</Button>
            </TokenAlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
