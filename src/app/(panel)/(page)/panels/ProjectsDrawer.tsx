"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ClockIcon, Loader2, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAllResearchProjects,
  ResearchProjectWithPanel,
} from "./actions";
import { ProjectCard } from "./ProjectCard";

export function ProjectsDrawer() {
  const t = useTranslations("PersonaPanel");

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ResearchProjectWithPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const result = await fetchAllResearchProjects({
      page,
      pageSize: 15,
      searchQuery: searchQuery || undefined,
    });
    if (result.success) {
      setProjects(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setLoading(false);
  }, [page, searchQuery]);

  // Load when drawer opens
  useEffect(() => {
    if (open) loadProjects();
  }, [open, loadProjects]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputRef.current?.value ?? "");
    setPage(1);
  };

  const clearSearch = () => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
    setPage(1);
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ClockIcon className="size-3.5" />
          {t("ListPage.researchProjects")}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[360px] sm:max-w-[360px] h-full mr-0 ml-auto">
        <DrawerHeader>
          <DrawerTitle className="text-sm">
            {t("ListPage.researchProjects")}
          </DrawerTitle>
          {pagination && (
            <p className="text-[11px] text-muted-foreground">
              {t("ListPage.projectsCount", { count: pagination.totalCount })}
            </p>
          )}
        </DrawerHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="shrink-0 relative mb-3">
            <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              defaultValue={searchQuery}
              placeholder={t("ListPage.searchProjects")}
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

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.token}
                    project={project}
                    onDeleted={(token) => {
                      setProjects((prev) => prev.filter((p) => p.token !== token));
                      if (pagination) {
                        setPagination({ ...pagination, totalCount: pagination.totalCount - 1 });
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-muted-foreground">
                  {t("ListPage.noProjectsYet")}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="shrink-0 flex justify-center py-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
