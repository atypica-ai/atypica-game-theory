"use client";
import { NewStudyButton } from "@/app/(newStudy)/components/NewStudyInputBox";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Loader2Icon, NotebookTextIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useRef } from "react";
import useSWR from "swr";
import { archiveStudy, fetchUserStudies } from "./actions";
import { ArchivedStudyItem } from "./ArchivedStudyItem";
import { StudyCard } from "./StudyCard";

export function StudyListPageClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const t = useTranslations("StudyListPage");
  const inputRef = useRef<HTMLInputElement>(null);

  // Use query params hook with initial values from server
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<{
    page: number;
    search: string;
  }>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
    },
    initialValues: initialSearchParams,
  });

  // Use SWR for data fetching
  const { data, isLoading, mutate } = useSWR(
    ["studies", currentPage, searchQuery],
    async () => {
      const result = await fetchUserStudies({
        page: currentPage,
        pageSize: 8, // 3x3-1 grid (留一个给 new study block)
        searchQuery,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      return {
        studies: result.data,
        pagination: result.pagination,
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const studies = data?.studies ?? [];
  const pagination = data?.pagination ?? null;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
  };

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setParams({ search: "", page: 1 });
  };

  const fetchArchived = useCallback(
    (params: { page: number; pageSize: number }) => fetchUserStudies({ ...params, archived: true }),
    [],
  );

  const handleArchive = useCallback(
    async (studyId: number) => {
      const result = await archiveStudy(studyId, true);
      if (result.success) mutate();
      return result;
    },
    [mutate],
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto max-w-6xl px-8 py-8 space-y-6">
        <div className="relative text-center space-y-3">
          <div className="absolute right-0 top-0">
            <ArchiveDrawer<ExtractServerActionData<typeof fetchUserStudies>[number]>
              fetchArchived={fetchArchived}
              renderItem={(study, onRefresh) => (
                <ArchivedStudyItem
                  key={study.id}
                  study={study}
                  onUnarchived={() => {
                    onRefresh();
                    mutate();
                  }}
                />
              )}
            />
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("description")}</p>
        </div>

        {/* Search bar */}
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
          <Button type="submit">{t("search") || "Search"}</Button>
        </form>

        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2Icon className="size-8 animate-spin" />
            </div>
          ) : studies.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <p className="text-muted-foreground">{t("noSearchResults")}</p>
              ) : (
                <EmptyStudyState />
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* New Study Card */}
                <NewStudyButton>
                  <div className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer">
                    <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-foreground/20 group-hover:bg-accent transition-all">
                      <NotebookTextIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-center space-y-1">
                      <div className="font-medium">{t("newStudyCard.title")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("newStudyCard.description")}
                      </div>
                    </div>
                  </div>
                </NewStudyButton>

                {studies.map((study) => (
                  <StudyCard key={study.id} study={study} onArchive={handleArchive} />
                ))}
              </div>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyStudyState() {
  const t = useTranslations("StudyListPage");
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-lg space-y-6">
      <div className="bg-primary/10 rounded-full p-4">
        <NotebookTextIcon className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{t("emptyState.title")}</h3>
        <p className="text-muted-foreground max-w-md">{t("emptyState.description")}</p>
      </div>
      <NewStudyButton>
        <Button>
          <NotebookTextIcon className="h-4 w-4" />
          {t("startNewStudy")}
        </Button>
      </NewStudyButton>
    </div>
  );
}
