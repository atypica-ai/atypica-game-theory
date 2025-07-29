"use client";
import { fetchInterviewReports, generateProjectShareToken } from "@/app/(interviewProject)/actions";
import { InterviewProjectWithSessions } from "@/app/(interviewProject)/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Bot, Copy, ExternalLink, MessageSquare, Share2, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InterviewReportsSection } from "./InterviewReportsSection";
import { SelectPersonaDialog } from "./SelectPersonaDialog";

interface ProjectDetailsProps {
  project: InterviewProjectWithSessions;
}

interface ReportItem {
  id: number;
  token: string;
  generatedAt: Date | null;
  createdAt: Date;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectDetails");
  const tList = useTranslations("InterviewProject.projectsList");
  const tErrors = useTranslations("InterviewProject.errors");
  const router = useRouter();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  // const [loading, setLoading] = useState(false);

  // Fetch reports on component mount and initialize from props
  useEffect(() => {
    // First set any reports that came with the project data
    if (project.interviewReport && project.interviewReport.length > 0) {
      setReports(project.interviewReport);
    }

    // Then fetch fresh data
    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const result = await fetchInterviewReports(project.id);
        if (result.success) {
          setReports(result.data);
        } else {
          console.error("Failed to fetch reports:", result.message);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoadingReports(false);
      }
    };
    loadReports();
  }, [project.id, project.interviewReport]);

  const getSessionStats = () => {
    const humanSessions = project.sessions.filter((s) => s.intervieweeUser).length;
    const personaSessions = project.sessions.filter((s) => s.intervieweePersona).length;
    return { humanSessions, personaSessions, total: project.sessions.length };
  };

  const handleGenerateShareLink = async () => {
    // setLoading(true);
    try {
      const result = await generateProjectShareToken(project.id, 72);
      if (result.success) {
        setShareUrl(`${window.location.origin}${result.data.shareUrl}`);
        toast.success(t("generateShareLink"));
      } else {
        toast.error(result.message || tErrors("generateShareLinkFailed"));
      }
    } catch {
      toast.error(tErrors("generateShareLinkFailed"));
    } finally {
      // setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("copyLink"));
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handlePersonaInterviewSuccess = () => {
    // Refresh the page to show new sessions
    router.refresh();
  };

  const handleReportsUpdateAction = (newReports: ReportItem[]) => {
    setReports(newReports);
  };

  const stats = getSessionStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("title")} #{project.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {tList("created")} {formatDate(project.createdAt, locale)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleGenerateShareLink}>
                <Share2 className="h-4 w-4" />
                {t("interviewHuman")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("shareProject")}</DialogTitle>
                <DialogDescription>{t("shareDescription")}</DialogDescription>
              </DialogHeader>
              {shareUrl && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="share-url">{t("shareUrl")}</Label>
                    <div className="flex space-x-2">
                      <Input id="share-url" value={shareUrl} readOnly className="flex-1" />
                      <Button onClick={handleCopyLink} size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {t("securityNote")}
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setShareDialogOpen(false)}>{t("close")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setPersonaDialogOpen(true)}>
            <Bot className="h-4 w-4" />
            {t("interviewAI")}
          </Button>
        </div>
      </div>

      {/* Project Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {t("projectBrief")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm max-h-64 overflow-scroll scrollbar-thin">
            {project.brief}
          </p>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalSessions")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("sessionsDescription")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("humanInterviews")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.humanSessions}</div>
            <p className="text-xs text-muted-foreground">{t("peopleInterviewed")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("aiInterviews")}</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.personaSessions}</div>
            <p className="text-xs text-muted-foreground">{t("personasInterviewed")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("interviewSessions")}</CardTitle>
          <CardDescription>{t("sessionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {project.sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t("noInterviews")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{t("noInterviewsDescription")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.sessions.map((interviewSession) => (
                <div
                  key={interviewSession.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {interviewSession.intervieweePersona ? (
                      <Badge variant="secondary" className="text-xs w-20 flex">
                        <Bot className="h-3 w-3" />
                        AI
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs w-20 flex">
                        <Users className="h-3 w-3" />
                        Human
                      </Badge>
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {interviewSession.title || t("sessionId")}
                        {" - "}
                        {interviewSession.intervieweePersona
                          ? interviewSession.intervieweePersona.name
                          : interviewSession.intervieweeUser
                            ? interviewSession.intervieweeUser.email
                            : `#${interviewSession.id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(interviewSession.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/interview/projects/${project.id}/sessions/${interviewSession.id}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Section */}
      <Card>
        <CardContent className="p-6">
          {loadingReports ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
            </div>
          ) : (
            <InterviewReportsSection
              project={project}
              reports={reports}
              onReportsUpdateAction={handleReportsUpdateAction}
            />
          )}
        </CardContent>
      </Card>

      <SelectPersonaDialog
        open={personaDialogOpen}
        onOpenChange={setPersonaDialogOpen}
        projectId={project.id}
        onSuccess={handlePersonaInterviewSuccess}
      />
    </div>
  );
}
