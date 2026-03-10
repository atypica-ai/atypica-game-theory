"use client";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { Loader2, Plus, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  archivePersonaPanel,
  deletePersonaPanel,
  fetchUserPersonaPanels,
  PersonaPanelWithDetails,
} from "./actions";
import { ArchivedPanelItem } from "./ArchivedPanelItem";
import { CreatePanelDialog } from "./CreatePanelDialog";
import { PanelCard } from "./PanelCard";
import { ProjectsDrawer } from "./ProjectsDrawer";

export function PersonaPanelsListClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const t = useTranslations("PersonaPanel");
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    const result = await fetchUserPersonaPanels({
      searchQuery: searchQuery || undefined,
      page: currentPage,
      pageSize: 11,
    });
    if (result.success) {
      setPanels(result.data);
      if (result.pagination) setPagination(result.pagination);
    } else {
      toast.error(t("ListPage.loadingFailed"));
    }
    setLoading(false);
  }, [t, searchQuery, currentPage]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setParams({ search: inputRef.current?.value ?? "", page: 1 });
  };

  const clearSearch = () => {
    if (inputRef.current) inputRef.current.value = "";
    setParams({ search: "", page: 1 });
  };

  const fetchArchived = useCallback(
    (params: { page: number; pageSize: number }) =>
      fetchUserPersonaPanels({ ...params, archived: true }),
    [],
  );

  const handleArchivePanel = useCallback(
    async (panelId: number) => {
      const result = await archivePersonaPanel(panelId, true);
      if (result.success) await loadPanels();
      return result;
    },
    [loadPanels],
  );

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

  return (
    <>
      <CreatePanelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPanelCreated={loadPanels}
      />

      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold">{t("title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ArchiveDrawer<PersonaPanelWithDetails>
              fetchArchived={fetchArchived}
              renderItem={(panel, onRefresh) => (
                <ArchivedPanelItem
                  key={panel.id}
                  panel={panel}
                  onUnarchived={() => {
                    onRefresh();
                    loadPanels();
                  }}
                />
              )}
            />
            <ProjectsDrawer />
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
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
          {pagination && (
            <p className="text-[11px] text-muted-foreground shrink-0">
              {t("ListPage.panelsCount", { count: pagination.totalCount })}
            </p>
          )}
        </div>

        {/* Panels Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : panels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* New Panel Card */}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted group-hover:bg-accent transition-colors">
                <Plus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{t("ListPage.createNewPanel")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("ListPage.createDescription")}
                </div>
              </div>
            </button>

            {panels.map((panel) => (
              <PanelCard
                key={panel.id}
                panel={panel}
                onDelete={handleDeletePanel}
                onArchive={handleArchivePanel}
                isDeleting={deletingPanelId === panel.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-lg space-y-6">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t("ListPage.createNewPanel")}</div>
              <div className="text-xs text-muted-foreground">
                {t("ListPage.createNewPanelDescription")}
              </div>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <Plus className="size-3.5" />
              {t("ListPage.startDiscussion")}
            </button>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center py-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setParam("page", page)}
            />
          </div>
        )}
      </div>
    </>
  );
}
