"use client";
import {
  deleteInterviewProject,
  fetchUserInterviewProjects,
} from "@/app/(interviewProject)/actions";
import { InterviewProjectWithSessions } from "@/app/(interviewProject)/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Bot, Briefcase, Calendar, ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateProjectDialog } from "./CreateProjectDialog";

export function InterviewProjectsClient() {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectsList");
  const tRoot = useTranslations("InterviewProject");
  const tDialog = useTranslations("InterviewProject.createProjectDialog");
  const tErrors = useTranslations("InterviewProject.errors");
  const [projects, setProjects] = useState<InterviewProjectWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadProjects = async () => {
    try {
      const result = await fetchUserInterviewProjects();
      if (result.success) {
        setProjects(result.data);
      } else {
        toast.error(result.message || tErrors("loadProjectsFailed"));
      }
    } catch {
      toast.error(tErrors("loadProjectsFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDeleteProject = async (projectId: number) => {
    try {
      const result = await deleteInterviewProject(projectId);
      if (result.success) {
        setProjects(projects.filter((p) => p.id !== projectId));
        toast.success("Project deleted successfully");
      } else {
        toast.error(result.message || tErrors("deleteProjectFailed"));
      }
    } catch {
      toast.error(tErrors("deleteProjectFailed"));
    }
  };

  const getSessionStats = (sessions: InterviewProjectWithSessions["sessions"]) => {
    const humanSessions = sessions.filter((s) => s.intervieweeUserId).length;
    const personaSessions = sessions.filter((s) => s.intervieweePersonaId).length;
    return { humanSessions, personaSessions, total: sessions.length };
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container mx-auto px-8 py-12 max-w-6xl">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-slate-900 mb-2">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-600 max-w-xl mx-auto">{t("description")}</p>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Project Quick Action Card */}
            <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-primary/20 rounded-full p-1">
                    <Plus className="size-4 text-primary" />
                  </div>
                  New Project
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="text-sm text-slate-600 text-center mb-4">
                  {t("createFirstProject")}
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full" size="sm">
                  <Plus className="size-3 mr-2" />
                  {tRoot("createProject")}
                </Button>
              </CardContent>
            </Card>

            {projects.map((project) => {
              const stats = getSessionStats(project.sessions);
              return (
                <Card key={project.id} className="transition-all duration-300 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                          {t("projectId")}
                          {project.id}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {t("created")} {formatDate(project.createdAt, locale)}
                          </span>
                        </CardDescription>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("deleteConfirmCancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {t("deleteConfirmDelete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {project.brief}
                    </p>

                    {stats.total > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {stats.humanSessions > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {stats.humanSessions} {t("humanSessions")}
                          </Badge>
                        )}
                        {stats.personaSessions > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            {stats.personaSessions} {t("aiSessions")}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <span className="text-xs text-gray-500 flex-1">
                        {stats.total} {stats.total === 1 ? t("sessions") : t("sessionsPlural")}
                      </span>
                      <Link href={`/interview/projects/${project.id}`}>
                        <Button variant="outline" size="sm" className="flex-1">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t("viewProject")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <div className="bg-primary/20 rounded-full p-1">
                      <Plus className="size-4 text-primary" />
                    </div>
                    New Project
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <div className="text-sm text-slate-600 text-center mb-4">
                    {t("createFirstProject")}
                  </div>
                  <Button onClick={() => setCreateDialogOpen(true)} className="w-full" size="sm">
                    <Plus className="size-3 mr-2" />
                    {tRoot("createProject")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <CreateProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onProjectCreated={loadProjects}
        />
      </div>
    </div>
  );
}
