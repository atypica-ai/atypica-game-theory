"use client";
import { NewStudyButton } from "@/app/(newStudy)/components/NewStudyInputBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { Loader2Icon, NotebookTextIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useRef } from "react";
import useSWR from "swr";
import { fetchUserStudies } from "./actions";
import { StudyCard } from "./StudyCard";

export function StudyListPageClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number>;
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
  const { data, isLoading } = useSWR(
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

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-center">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-center text-sm md:text-base">
        {t("description")}
      </p>

      {/* Search bar */}
      <div className="container mx-auto max-w-xl">
        <form onSubmit={handleSearch} className="flex gap-2">
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
      </div>

      <div className="container mx-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 w-full">
              {/* New Study Quick Action Card */}
              <Card className="flex flex-col h-full border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-linear-to-br from-zinc-50 to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-900/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-zinc-600 dark:bg-zinc-500 rounded-xl p-2.5 shadow-sm">
                      <NotebookTextIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t("newStudyCard.title")}
                      </h3>
                      <div className=" text-zinc-700 dark:text-zinc-300 text-xs font-medium w-fit">
                        {t("newStudyCard.badge")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center pb-4">
                  <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
                    {t("newStudyCard.description")}
                  </p>
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/30 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-l-8 border-l-zinc-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <NewStudyButton>
                    <Button className="w-full bg-zinc-600 dark:bg-zinc-500 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-medium py-2.5">
                      <NotebookTextIcon className="h-4 w-4" />
                      {t("startNewStudy")}
                    </Button>
                  </NewStudyButton>
                </CardFooter>
              </Card>

              {studies.map((study) => (
                <StudyCard key={study.studyUserChat.id} study={study} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setParam("page", page)}
                />
              </div>
            )}
          </>
        )}
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
