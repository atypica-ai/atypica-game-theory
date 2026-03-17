"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, FileTextIcon, Loader2, ScrollTextIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Streamdown } from "streamdown";
import { ReportItem } from "../ReportItem";

export function DiscussionSidebar({
  summary,
  minutes,
  isComplete,
  projectToken,
  reports,
  onGenerateReport,
  isAgentActive,
}: {
  summary: string;
  minutes: string;
  isComplete: boolean;
  projectToken: string;
  reports?: Array<{ reportToken: string; state: "completed" | "in-progress" }>;
  onGenerateReport?: () => void;
  isAgentActive?: boolean;
}) {
  const tProject = useTranslations("PersonaPanel.ProjectDetailPage");
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");

  return (
    <div className="hidden lg:flex flex-col w-72 border-l border-border">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {/* Summary button → Dialog */}
        {summary && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4">
                <ScrollTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium">{t("summary")}</span>
                  <span className="text-[10px] text-muted-foreground">{t("clickToView")}</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                <DialogTitle className="text-base">{t("summary")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 text-xs leading-relaxed">
                <Streamdown mode="static">{summary}</Streamdown>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Minutes button → Dialog */}
        {minutes && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium">{t("minutes")}</span>
                  <span className="text-[10px] text-muted-foreground">{t("clickToView")}</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                <DialogTitle className="text-base">{t("minutes")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 text-xs leading-relaxed">
                <Streamdown mode="static">{minutes}</Streamdown>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Artifacts */}
        <div className="pt-2">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50 mb-2">
            {t("artifacts")}
          </div>
          {reports && reports.length > 0 ? (
            <div className="space-y-2">
              {reports.map((report) => (
                <ReportItem
                  key={report.reportToken}
                  reportToken={report.reportToken}
                  state={report.state}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">{t("artifactsPlaceholder")}</p>
          )}

          {/* Generate Report button */}
          {onGenerateReport && (
            <ConfirmDialog
              title={t("generateReport")}
              description={t("generateReportConfirm")}
              onConfirm={onGenerateReport}
              confirmLabel={t("generateReport")}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-xs mt-2"
                disabled={isAgentActive}
              >
                <SparklesIcon className="size-3.5" />
                {t("generateReport")}
              </Button>
            </ConfirmDialog>
          )}
        </div>

        {/* Loading state when not complete and no content yet */}
        {!isComplete && !summary && !minutes && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="size-3 animate-spin" />
            {t("inProgress")}
          </div>
        )}
      </div>

      {/* View Agent — bottom */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <Link
          href={`/universal/${projectToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
        >
          {tProject("viewAgentChat")}
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </div>
  );
}
