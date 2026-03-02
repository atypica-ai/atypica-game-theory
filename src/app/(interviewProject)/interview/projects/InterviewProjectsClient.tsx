"use client";
import { fetchUserInterviewProjects } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  ArrowRight,
  BotIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function InterviewProjectsClient({
  isCreateEnabled,
  initialSearchParams,
}: {
  isCreateEnabled: boolean;
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectsList");
  const [projects, setProjects] = useState<
    ExtractServerActionData<typeof fetchUserInterviewProjects>
  >([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUserInterviewProjects({
        searchQuery: searchQuery || undefined,
        page: currentPage,
      });
      if (!result.success) throw result;
      setProjects(result.data);
      if (result.pagination) setPagination(result.pagination);
    } catch (error) {
      toast.error((error as Error).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, searchQuery, currentPage]);

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

  const NewProjectCard = () => (
    <Link
      href={isCreateEnabled ? "/interview/projects/new" : "/pricing"}
      className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px]"
    >
      <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-foreground/20 group-hover:bg-accent transition-all">
        <PlusIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm text-center space-y-1">
        <div className="font-medium">{t("newProject")}</div>
        <div className="text-xs text-muted-foreground">{t("createFirstProject")}</div>
      </div>
    </Link>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-8">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("description")}</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              defaultValue={searchQuery}
              placeholder={t("searchPlaceholder")}
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
          </div>
          <Button type="submit">{t("search")}</Button>
        </form>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <NewProjectCard />
            {projects.map((project) => {
              const extra = project.extra as InterviewProjectExtra;
              return (
                <div
                  key={project.id}
                  className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300 flex flex-col"
                >
                  <Link
                    href={`/interview/project/${project.token}`}
                    className="p-4 flex-1 flex flex-col"
                  >
                    {/* Brief */}
                    <div className="space-y-1">
                      <div className="text-sm font-medium leading-snug line-clamp-3">
                        {project.brief || t("newProject")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(project.createdAt, locale)}
                      </div>
                    </div>

                    <div className="mt-4 mb-4"></div>

                    {/* Footer: stats + arrow on same line */}
                    <div className="flex items-center gap-3 pt-4 mt-auto border-t border-border/50 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {project.sessionStats.humanSessions} {t("humanSessions")}
                      </span>
                      <span className="flex items-center gap-1">
                        <BotIcon className="h-3 w-3" />
                        {project.sessionStats.personaSessions} {t("aiSessions")}
                      </span>
                      {extra?.processing ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <SparklesIcon className="h-3 w-3 animate-pulse" />
                          {t("optimizing")}
                        </span>
                      ) : project.questions.length > 0 ? (
                        <span>{t("questions", { count: project.questions.length })}</span>
                      ) : null}
                      <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center">
            <NewProjectCard />
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setParam("page", page)}
            />
            <div className="text-sm text-muted-foreground">
              Total: {pagination.totalCount.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
