"use client";
import { fetchInterviewReports, generateInterviewReport } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDistanceToNow } from "@/lib/utils";
import { ExternalLinkIcon, FileTextIcon, Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ReportItem {
  id: number;
  token: string;
  generatedAt: Date | null;
  createdAt: Date;
}

export function InterviewReportsSection({ projectId }: { projectId: number }) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.reports");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<ReportItem | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const result = await fetchInterviewReports(projectId);
      if (!result.success) throw result;
      setReports(result.data);
    } catch (error) {
      console.log("Failed to fetch reports:", error);
    } finally {
      setLoadingReports(false);
    }
  }, [projectId]);

  // Fetch reports on component mount
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerateReport = useCallback(async () => {
    setGeneratingReport(true);
    setShowConfirmDialog(false);
    try {
      const result = await generateInterviewReport(projectId);
      if (!result.success) throw result;
      setIsReportDialogOpen(result.data);
      loadReports();
    } catch (error) {
      toast.error((error as Error).message || t("generateReportError"));
    } finally {
      setGeneratingReport(false);
    }
  }, [projectId, loadReports]);

  return (
    <>
      <Card>
        <CardContent className="px-6">
          {loadingReports ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t("loadingReports")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <FileTextIcon className="h-5 w-5 mr-2" />
                    {t("title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("description")}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={loadReports}
                    disabled={loadingReports}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCwIcon className={`h-4 w-4 ${loadingReports ? "animate-spin" : ""}`} />
                    {t("refresh")}
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={generatingReport}
                    size="sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {generatingReport ? t("generating") : t("generateReport")}
                  </Button>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                  <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-muted-foreground mb-2">
                    {t("noReportsGenerated")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">{t("noReportsDescription")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report) => (
                    <div
                      key={report.token}
                      className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        if (!report.generatedAt) {
                          setIsReportDialogOpen(report);
                        } else {
                          window.open(
                            `/artifacts/interview-report/${report.token}/share`,
                            "_blank",
                          );
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <FileTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">
                              {t("reportNumber")}
                              {report.token.slice(-8)}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(report.createdAt, locale)}
                            </p>
                          </div>
                        </div>

                        {!report.generatedAt && (
                          <Loader2Icon className="h-4 w-4 animate-spin text-amber-500" />
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        {report.generatedAt ? (
                          <span className="text-green-600 dark:text-green-400">
                            ✓ {t("generated")} {formatDistanceToNow(report.generatedAt)} {t("ago")}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            ⏳ {t("generating")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Report Generation Dialog */}
      <Dialog
        open={!!isReportDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReportDialogOpen(null);
          }
        }}
        modal
      >
        <DialogContent
          className="sm:max-w-[90vw] h-[90vh] flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
              {t("generatingReportTitle")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{t("generatingReportDescription")}</p>
          </DialogHeader>
          {isReportDialogOpen && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/artifacts/interview-report/${isReportDialogOpen.token}/raw?live=1`}
                className="w-full h-full border rounded-md"
                title="Live Report Generation"
              />
            </div>
          )}
          <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-muted-foreground">{t("refreshTip")}</div>
            <div className="flex gap-2">
              {isReportDialogOpen && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/artifacts/interview-report/${isReportDialogOpen.token}/raw`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    {t("openInNewTab")}
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsReportDialogOpen(null)}>
                {t("close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("generateReportConfirmTitle")}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("generateReportConfirmDescription")}</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleGenerateReport} disabled={generatingReport}>
              {generatingReport ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  {t("generating")}
                </>
              ) : (
                t("generateReport")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
