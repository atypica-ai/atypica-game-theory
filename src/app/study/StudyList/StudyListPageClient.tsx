"use client";
import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { NewStudyButton } from "@/components/NewStudyInputBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { CalendarDaysIcon, Loader2Icon, NotebookTextIcon, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchUserStudies } from "./actions";

type TStudy = ExtractServerActionData<typeof fetchUserStudies>[number];
type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function StudyListPageClient() {
  const t = useTranslations("StudyPage.List");
  const [studies, setStudies] = useState<TStudy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");

      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  // Update URL when page or search changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());

    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }

    window.history.replaceState({}, "", url.toString());
  }, [currentPage, searchQuery]);

  const loadStudies = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchUserStudies({
        page: currentPage,
        pageSize: 8, // 3x3-1 grid (留一个给 new study block)
        searchQuery,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      setStudies(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch studies:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  };

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <>
      <GlobalHeader leftMenus={<LeftMenus />} />
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
                <Card className="flex flex-col h-full transition-shadow hover:shadow-md border-dashed border border-primary/30">
                  <CardHeader className="flex flex-row items-center">
                    <div className="bg-primary/20 rounded-full p-1 mr-2 shrink-0">
                      <NotebookTextIcon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {t("newStudyCard.title") || "New Research"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center">
                    <div className="text-sm text-muted-foreground mb-4 text-center">
                      {t("newStudyCard.description") ||
                        "Start exploring a new topic with AI-powered research and analysis"}
                    </div>
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                      <div className="bg-primary/10 px-2 py-1 rounded-full">
                        {t("newStudyCard.badge") || "Quick Start"}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <NewStudyButton>
                      <Button className="w-full">
                        <NotebookTextIcon className="h-4 w-4 mr-2" />
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
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyStudyState() {
  const t = useTranslations("StudyPage.List");
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

function StudyCard({ study: { studyUserChat, analyst } }: { study: TStudy }) {
  const t = useTranslations("StudyPage.List");
  const locale = useLocale();

  // Determine study status
  const getStudyStatus = () => {
    if (studyUserChat.backgroundToken) {
      return "backgroundRunning";
    } else if (analyst?.reports && analyst.reports.length > 0) {
      return "reportGenerated";
    } else {
      return "notCompleted";
    }
  };

  const status = getStudyStatus();

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center">
        <HippyGhostAvatar seed={studyUserChat.id} className="size-6 mr-2 shrink-0" />
        <CardTitle className="text-lg font-semibold line-clamp-1">{studyUserChat.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-sm text-muted-foreground mb-3 line-clamp-3 leading-[1.25rem] h-[3.75rem]">
          {analyst?.topic || t("noTopic")}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarDaysIcon className="mr-1 h-4 w-4" />
            <div>{formatDate(studyUserChat.updatedAt, locale)}</div>
          </div>
          <div className="flex items-center">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                status === "backgroundRunning"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                  : status === "reportGenerated"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {t(`status.${status}`)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/study/${studyUserChat.token}`}>{t("viewStudy")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
