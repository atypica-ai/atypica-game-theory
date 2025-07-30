"use client";
import { fetchUserInterviewProjects } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { BotIcon, BriefcaseIcon, CalendarIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateProjectDialog } from "./CreateProjectDialog";

export function InterviewProjectsClient() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("InterviewProject.projectsList");
  const [projects, setProjects] = useState<
    ExtractServerActionData<typeof fetchUserInterviewProjects>
  >([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const result = await fetchUserInterviewProjects();
      if (!result.success) throw result;
      setProjects(result.data);
    } catch (error) {
      toast.error((error as Error).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const NewProjectCard = () => (
    <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/20 rounded-full p-1">
            <PlusIcon className="size-4 text-primary" />
          </div>
          {t("newProject")}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="text-sm text-slate-600 text-center mb-4">{t("createFirstProject")}</div>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full" size="sm">
          <PlusIcon className="size-3" />
          {t("newProject")}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-12 max-w-6xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-slate-900 mb-2">
          <BriefcaseIcon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-slate-600 max-w-xl mx-auto">{t("description")}</p>
      </div>
      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NewProjectCard />
          {projects.map((project) => (
            <Card
              key={project.id}
              className="transition-all duration-300 hover:shadow-md cursor-pointer"
              onClick={() => router.push(`/interview/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center text-xs gap-2 font-normal">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDate(project.createdAt, locale)}
                  </div>
                </CardTitle>
                <CardDescription className="mt-3">
                  <div className="text-sm line-clamp-3">{project.brief}</div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="text-xs">
                    <UsersIcon className="h-3 w-3" />
                    {project.sessionStats.humanSessions} {t("humanSessions")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <BotIcon className="h-3 w-3" />
                    {project.sessionStats.personaSessions} {t("aiSessions")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <NewProjectCard />
        </div>
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={loadProjects}
      />
    </div>
  );
}
