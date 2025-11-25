"use client";
import { fetchInterviewReportsByProjectToken } from "@/app/(interviewProject)/(detail)/actions";
import { generateInterviewReport } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, formatDate, formatDistanceToNow } from "@/lib/utils";
import { InterviewReportExtra } from "@/prisma/client";
import { ExternalLinkIcon, FileTextIcon, Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { InterviewReportShareButton } from "./InterviewReportShareButton";

interface ReportItem {
  id: number;
  token: string;
  generatedAt: Date | null;
  createdAt: Date;
  extra: InterviewReportExtra;
}

export function InterviewReportsSection({
  project,
  readOnly = false,
}: {
  project: {
    id: number;
    token: string;
  };
  readOnly?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.reports");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<ReportItem | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [includePersonaSessions, setIncludePersonaSessions] = useState<string>("all"); // "all" or "human-only"

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const result = await fetchInterviewReportsByProjectToken({ projectToken: project.token });

      if (!result.success) throw result;
      setReports(result.data);
    } catch (error) {
      console.log("Failed to fetch reports:", error);
    } finally {
      setLoadingReports(false);
    }
  }, [project.token]);

  // Fetch reports on component mount
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerateReport = useCallback(async () => {
    setGeneratingReport(true);
    setShowConfirmDialog(false);
    try {
      const includePersona = includePersonaSessions === "all";
      const result = await generateInterviewReport(project.id, includePersona);
      if (!result.success) throw result;
      setIsReportDialogOpen(result.data);
      loadReports();
    } catch (error) {
      toast.error((error as Error).message || t("generateReportError"));
    } finally {
      setGeneratingReport(false);
    }
  }, [project.id, includePersonaSessions, loadReports, t]);

  return (
    <>
      <Card>
        <CardContent className="px-6">
          {loadingReports ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <Loader2Icon className="size-8 animate-spin" />
              <p className="text-muted-foreground text-xs">{t("loadingReports")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <FileTextIcon className="h-5 w-5 mr-2" />
                    {t("title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("description")}</p>
                </div>
                {!readOnly ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={loadReports}
                      disabled={loadingReports}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCwIcon className={cn("h-4 w-4", loadingReports && "animate-spin")} />
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
                ) : null}
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
                  <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-muted-foreground mb-2">
                    {t("noReportsGenerated")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">{t("noReportsDescription")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(readOnly
                    ? reports.filter((report) => !!report.generatedAt) // 如果是分享，只显示已生成的
                    : reports
                  ).map((report) =>
                    report.generatedAt ? (
                      <InterviewReportShareButton
                        key={report.token}
                        reportToken={report.token}
                        download={!readOnly}
                      >
                        <div className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <FileTextIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">
                                  {t("reportNumber")}
                                  {report.token.slice(-8)}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(report.createdAt, locale)}
                                </p>
                                {report.extra?.sessions && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("basedOnSessions", { count: report.extra.sessions.length })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            <span className="text-green-600 dark:text-green-400">
                              ✓ {t("generated")} {formatDistanceToNow(report.generatedAt)}{" "}
                              {t("ago")}
                            </span>
                          </div>
                        </div>
                      </InterviewReportShareButton>
                    ) : (
                      <div
                        key={report.token}
                        className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (!readOnly) {
                            setIsReportDialogOpen(report);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileTextIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {t("reportNumber")}
                                {report.token.slice(-8)}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(report.createdAt, locale)}
                              </p>
                              {report.extra?.sessions && (
                                <p className="text-xs text-muted-foreground">
                                  {t("basedOnSessions", { count: report.extra.sessions.length })}
                                </p>
                              )}
                            </div>
                          </div>

                          <Loader2Icon className="h-4 w-4 animate-spin text-amber-500" />
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <span className="text-amber-600 dark:text-amber-400">
                            ⏳ {t("generating")}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Report Generation Dialog */}
      {!readOnly && (
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
      )}

      {/* Data Source Selection Dialog */}
      {!readOnly && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("generateReportConfirmTitle")}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t("selectDataSourceDescription")}</p>
            </DialogHeader>

            <div className="py-4">
              <RadioGroup value={includePersonaSessions} onValueChange={setIncludePersonaSessions}>
                <Label
                  htmlFor="includePersonaSessions/all-sessions"
                  className="flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value="all" id="includePersonaSessions/all-sessions" />
                  <div className="flex-1">
                    <div className="font-medium">{t("allInterviews")}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("allInterviewsDescription")}
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="includePersonaSessions/human-only"
                  className="flex items-start space-x-3 space-y-0 rounded-md border p-4 mt-3 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value="human-only" id="includePersonaSessions/human-only" />
                  <div className="flex-1">
                    <div className="font-medium">{t("humanInterviewsOnly")}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("humanInterviewsOnlyDescription")}
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

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
      )}
    </>
  );
}
