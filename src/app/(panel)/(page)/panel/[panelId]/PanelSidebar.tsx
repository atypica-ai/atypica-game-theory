"use client";
import {
  fetchAllResearchProjects,
  ResearchProjectWithPanel,
} from "@/app/(panel)/(page)/panels/actions";
import { ProjectCard } from "@/app/(panel)/(page)/panels/ProjectCard";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Mic, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { type ResearchType } from "./actions";
import { NewPanelProjectDialog } from "./NewPanelProjectDialog";

interface PanelSidebarProps {
  panelId: number;
  personas: Array<{ id: number; name: string }>;
}

export function PanelSidebar({ panelId, personas }: PanelSidebarProps) {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectDefaultType, setNewProjectDefaultType] = useState<ResearchType>("focusGroup");

  const [projects, setProjects] = useState<ResearchProjectWithPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const result = await fetchAllResearchProjects({ panelId, pageSize: 10, page });
    if (result.success) {
      setProjects(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    }
    setLoading(false);
  }, [panelId, page]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openNewProjectDialog = (type: ResearchType) => {
    setNewProjectDefaultType(type);
    setShowNewProject(true);
  };

  const researchCubes = [
    { type: "focusGroup" as const, icon: Users, label: t("DetailPage.projectType.focusGroup") },
    {
      type: "userInterview" as const,
      icon: MessageCircle,
      label: t("DetailPage.projectType.userInterview"),
    },
    {
      type: "expertInterview" as const,
      icon: Mic,
      label: t("DetailPage.projectType.expertInterview"),
    },
  ];

  return (
    <>
      {/* Quick Research — fixed */}
      <div className="shrink-0 pb-6">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
          {t("DetailPage.quickResearch")}
        </h3>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {researchCubes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => openNewProjectDialog(type)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border border-border",
                "hover:border-foreground/20 hover:bg-accent transition-all",
              )}
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Research Projects — scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <h3 className="shrink-0 text-sm font-medium tracking-tight text-muted-foreground uppercase mb-3">
          {t("DetailPage.researchProjects")}
        </h3>

        <div className="flex-1 overflow-y-auto pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">{t("DetailPage.noProjects")}</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectCard key={project.token} project={project} locale={locale} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-background/80 backdrop-blur-sm py-2">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <NewPanelProjectDialog
        panelId={panelId}
        personas={personas}
        defaultType={newProjectDefaultType}
        open={showNewProject}
        onOpenChange={setShowNewProject}
      />
    </>
  );
}
