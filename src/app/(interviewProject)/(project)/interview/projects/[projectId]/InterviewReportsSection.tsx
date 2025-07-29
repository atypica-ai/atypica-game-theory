"use client";

import {
  deleteInterviewReport,
  fetchInterviewReports,
  generateInterviewReport,
} from "@/app/(interviewProject)/actions";
import { InterviewProjectWithSessions } from "@/app/(interviewProject)/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "@/lib/utils";
import { ExternalLink, FileText, Loader2, Plus, Share, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ReportItem {
  id: number;
  token: string;
  generatedAt: Date | null;
  createdAt: Date;
}

interface InterviewReportsSectionProps {
  project: InterviewProjectWithSessions;
  reports: ReportItem[];
  onReportsUpdateAction: (reports: ReportItem[]) => void;
}

export function InterviewReportsSection({
  project,
  reports,
  onReportsUpdateAction,
}: InterviewReportsSectionProps) {
  // const t = useTranslations("InterviewProject.projectDetails");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<ReportItem | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleGenerateReport = useCallback(async () => {
    if (project.sessions.length === 0) {
      toast.error("No interview sessions found. Please conduct interviews first.");
      return;
    }

    setGeneratingReport(true);
    try {
      const result = await generateInterviewReport(project.id);
      if (result.success) {
        toast.success("Report generation started");

        // Refresh reports to show the new generating report
        const refreshReports = async () => {
          const reportsResult = await fetchInterviewReports(project.id);
          if (reportsResult.success) {
            onReportsUpdateAction(reportsResult.data);

            // Find the newly created report and open the live dialog
            const newReport = reportsResult.data.find((r) => r.token === result.data.token);
            if (newReport && !newReport.generatedAt) {
              setIsReportDialogOpen(newReport);
            }
          }
        };
        await refreshReports();
      } else {
        toast.error(result.message || "Failed to generate report");
      }
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  }, [project.id, project.sessions.length, onReportsUpdateAction]);

  const handleDeleteReport = useCallback(
    async (reportId: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const result = await deleteInterviewReport(reportId);
        if (result.success) {
          toast.success("Report deleted");
          onReportsUpdateAction(reports.filter((r) => r.id !== reportId));
        } else {
          toast.error(result.message || "Failed to delete report");
        }
      } catch {
        toast.error("Failed to delete report");
      }
    },
    [reports, onReportsUpdateAction],
  );

  // Poll for report completion when dialog is open
  useEffect(() => {
    if (isReportDialogOpen && !isReportDialogOpen.generatedAt) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const reportsResult = await fetchInterviewReports(project.id);
          if (reportsResult.success) {
            onReportsUpdateAction(reportsResult.data);

            // Check if the report we're watching is now complete
            const updatedReport = reportsResult.data.find(
              (r) => r.token === isReportDialogOpen.token,
            );
            if (updatedReport?.generatedAt) {
              toast.success("Report generated successfully!");
              setIsReportDialogOpen(null);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error("Error polling for report completion:", error);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isReportDialogOpen, project.id, onReportsUpdateAction]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Reports
            </h3>
            <p className="text-sm text-muted-foreground">
              Generated analysis reports from interview sessions
            </p>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={generatingReport || project.sessions.length === 0}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {generatingReport ? "Generating..." : "Generate Report"}
          </Button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">No Reports Generated</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first report to analyze interview insights
            </p>
            {project.sessions.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                💡 You need to conduct at least one interview before generating a report
              </p>
            )}
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
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Report #{report.token.slice(-8)}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>

                  {!report.generatedAt && (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  )}
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  {report.generatedAt ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✓ Generated {formatDistanceToNow(report.generatedAt)} ago
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">⏳ Generating...</span>
                  )}
                </div>

                {report.generatedAt && (
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/artifacts/interview-report/${report.token}/share`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Share className="h-3 w-3 mr-1" />
                      Share
                    </Link>

                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/artifacts/interview-report/${report.token}/raw`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      <button
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        className="inline-flex items-center text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Report Generation Dialog */}
      <Dialog
        open={!!isReportDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReportDialogOpen(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
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
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating Interview Report
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Watch your report being generated in real-time. You can close this dialog and the
              generation will continue in the background.
            </p>
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
            <div className="text-xs text-muted-foreground">
              💡 Tip: You can bookmark the report URL to check progress later
            </div>
            <div className="flex gap-2">
              {isReportDialogOpen && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/artifacts/interview-report/${isReportDialogOpen.token}/raw`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReportDialogOpen(null);
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
