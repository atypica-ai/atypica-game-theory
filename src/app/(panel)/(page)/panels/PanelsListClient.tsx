"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { Loader2, Plus, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deletePersonaPanel,
  fetchUserPersonaPanels,
  PersonaPanelWithDetails,
} from "./actions";
import { CreatePanelDialog } from "./CreatePanelDialog";
import { PanelCard } from "./PanelCard";
import { ProjectsDrawer } from "./ProjectsDrawer";

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
      pageSize: 12,
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
            <ProjectsDrawer />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="size-3.5" />
              {t("ListPage.newPanel")}
            </Button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative max-w-md">
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

        {/* Panel count */}
        {pagination && (
          <p className="text-[11px] text-muted-foreground">
            {t("ListPage.panelsCount", { count: pagination.totalCount })}
          </p>
        )}

        {/* Panels Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : panels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="text-center space-y-1">
              <div className="text-sm font-medium">{t("ListPage.createNewPanel")}</div>
              <div className="text-xs text-muted-foreground">
                {t("ListPage.createNewPanelDescription")}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="size-3.5" />
              {t("ListPage.startDiscussion")}
            </Button>
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
