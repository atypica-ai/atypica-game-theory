"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Plus, SearchIcon, Sparkles, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deletePersonaPanel,
  fetchAllResearchProjects,
  fetchUserPersonaPanels,
  PersonaPanelWithDetails,
  ResearchProjectWithPanel,
} from "./actions";
import { CreatePanelDialog } from "./CreatePanelDialog";
import { PanelCard } from "./PanelCard";
import { ProjectCard } from "./ProjectCard";

export function PersonaPanelsListClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Research Projects state
  const [projects, setProjects] = useState<ResearchProjectWithPanel[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectPage, setProjectPage] = useState(1);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [projectsPagination, setProjectsPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<{ page: number; search: string }>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
    },
    initialValues: initialSearchParams,
  });

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    const result = await fetchUserPersonaPanels({
      searchQuery: searchQuery || undefined,
      page: currentPage,
      pageSize: 10,
    });
    if (result.success) {
      setPanels(result.data);
      if (result.pagination) setPagination(result.pagination);
    } else {
      toast.error(t("ListPage.loadingFailed"));
    }
    setLoading(false);
  }, [t, searchQuery, currentPage]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    const result = await fetchAllResearchProjects({
      page: projectPage,
      pageSize: 10,
      searchQuery: projectSearchQuery || undefined,
    });
    if (result.success) {
      setProjects(result.data);
      if (result.pagination) setProjectsPagination(result.pagination);
    }
    setProjectsLoading(false);
  }, [projectPage, projectSearchQuery]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setParams({ search: inputRef.current?.value ?? "", page: 1 });
  };

  const clearSearch = () => {
    if (inputRef.current) inputRef.current.value = "";
    setParams({ search: "", page: 1 });
  };

  const handleProjectSearch = (e: FormEvent) => {
    e.preventDefault();
    setProjectSearchQuery(projectInputRef.current?.value ?? "");
    setProjectPage(1);
  };

  const clearProjectSearch = () => {
    if (projectInputRef.current) projectInputRef.current.value = "";
    setProjectSearchQuery("");
    setProjectPage(1);
  };

  const handleDeletePanel = useCallback(
    async (panelId: number) => {
      setDeletingPanelId(panelId);
      const result = await deletePersonaPanel(panelId);
      setDeletingPanelId(null);

      if (result.success) {
        toast.success(t("ListPage.deleteSuccess"));
        await loadPanels();
      } else {
        toast.error(t("ListPage.deleteFailed"));
      }
    },
    [t, loadPanels],
  );

  // ─── Main render ───────────────────────────────────────────────
  return (
    <>
      <CreatePanelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPanelCreated={loadPanels}
      />

      <FitToViewport>
        <div
          className={cn(
            "container mx-auto max-w-7xl px-4 md:px-8 py-8",
            "h-full flex flex-col justify-start items-stretch overflow-hidden",
          )}
        >
          {/* Page Header */}
          <div
            className={cn(
              "mb-8",
              "hidden", // 暂时隐藏，太占空间
            )}
          >
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>
          </div>

          {/* 2-Column Layout */}
          <div className="flex-1 flex flex-row gap-8 items-stretch overflow-hidden">
            {/* Left Column - Persona Panels */}
            <section className="space-y-4 flex-3 flex flex-col items-stretch overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="space-y-0.5">
                  <h2 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {t("ListPage.personaPanels")}
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {pagination
                      ? t("ListPage.panelsCount", { count: pagination.totalCount })
                      : t("ListPage.panelsCount", { count: 0 })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 gap-1 px-2 text-[11px] font-medium tracking-wider uppercase text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                  {t("ListPage.newPanel")}
                </Button>
              </div>

              <div
                className={cn(
                  "flex-1 border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent rounded-3xl",
                  "relative overflow-hidden",
                )}
              >
                {/* Search within card */}
                <form
                  onSubmit={handleSearch}
                  className="absolute z-1 left-4 right-4 top-5 bg-background/30 backdrop-blur-md"
                >
                  <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    defaultValue={searchQuery}
                    placeholder={t("ListPage.searchPlaceholder")}
                    className="pl-8"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </form>

                {/* Panels List - Scrollable */}
                <div className="h-full pt-18 pb-20 px-4 overflow-y-auto scrollbar-thin">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : panels.length > 0 ? (
                    <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                      {panels.map((panel) => (
                        <PanelCard
                          key={panel.id}
                          panel={panel}
                          locale={locale}
                          onDelete={handleDeletePanel}
                          isDeleting={deletingPanelId === panel.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="size-12 rounded-full border border-dashed border-border flex items-center justify-center">
                        <MessageCircle className="size-6 text-muted-foreground" />
                      </div>
                      <div className="text-center space-y-1">
                        <div className="text-sm font-medium">{t("ListPage.createNewPanel")}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("ListPage.createNewPanelDescription")}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCreateDialog(true)}
                        className="mt-2 text-sm hover:underline flex items-center gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        {t("ListPage.startDiscussion")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="absolute z-1 bottom-1 left-1/2 translate-x-[-50%] bg-background/30 backdrop-blur-md px-2 py-1 rounded-full overflow-hidden">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => setParam("page", page)}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Right Column - Research Projects */}
            <section className="space-y-4 flex-2 flex flex-col items-stretch overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="space-y-0.5">
                  <h2 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {t("ListPage.researchProjects")}
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {projectsPagination
                      ? t("ListPage.projectsCount", { count: projectsPagination.totalCount })
                      : t("ListPage.projectsCount", { count: 0 })}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex-1 border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent rounded-3xl",
                  "relative overflow-hidden",
                )}
              >
                {/* Search within card */}
                <form
                  onSubmit={handleProjectSearch}
                  className="absolute z-1 left-4 right-4 top-5 bg-background/30 backdrop-blur-md"
                >
                  <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={projectInputRef}
                    defaultValue={projectSearchQuery}
                    placeholder={t("ListPage.searchProjects")}
                    className="pl-8"
                  />
                  {projectSearchQuery && (
                    <button
                      type="button"
                      onClick={clearProjectSearch}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </form>

                {/* Projects List - Scrollable */}
                <div className="h-full pt-18 pb-20 px-4 overflow-y-auto scrollbar-thin">
                  {projectsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <ProjectCard key={project.token} project={project} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="size-12 rounded-full border border-dashed border-border flex items-center justify-center">
                        <Sparkles className="size-6 text-muted-foreground" />
                      </div>
                      <div className="text-center space-y-1">
                        <div className="text-sm font-medium">{t("ListPage.noProjectsYet")}</div>
                        <div className="text-xs text-muted-foreground max-w-xs">
                          {t("ListPage.projectsEmptyDescription")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {projectsPagination && projectsPagination.totalPages > 1 && (
                  <div className="absolute z-1 bottom-1 left-1/2 translate-x-[-50%] bg-background/30 backdrop-blur-md px-2 py-1 rounded-full overflow-hidden">
                    <Pagination
                      currentPage={projectsPagination.page}
                      totalPages={projectsPagination.totalPages}
                      onPageChange={setProjectPage}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </FitToViewport>
    </>
  );
}
