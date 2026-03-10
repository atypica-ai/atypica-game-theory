"use client";
import { archivePersona, fetchUserPersonas } from "@/app/(persona)/actions";
import { ArchiveButton } from "@/components/ArchiveButton";
import { ArchiveDrawer } from "@/components/ArchiveDrawer";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { ArrowRight, Loader2Icon, PlusIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArchivedPersonaItem } from "./ArchivedPersonaItem";
import { SharePersonaButton } from "./SharePersonaButton";

type PersonaWithStatus = ExtractServerActionData<typeof fetchUserPersonas>[number];

export function PersonasListClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number | boolean>;
}) {
  const t = useTranslations("PersonaImport.personas");
  const locale = useLocale();
  const [personas, setPersonas] = useState<PersonaWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchUserPersonas({
        searchQuery: searchQuery || undefined,
        page: currentPage,
      });
      if (!result.success) throw result;
      setPersonas(result.data);
      if (result.pagination) setPagination(result.pagination);
    } catch (error) {
      console.log("Failed to fetch personas:", error);
      toast.error(t("loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t, searchQuery, currentPage]);

  useEffect(() => {
    loadPersonas();
    // Only poll when not searching
    if (!searchQuery) {
      const interval = setInterval(() => {
        loadPersonas();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [loadPersonas, searchQuery]);

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
      fetchUserPersonas({ ...params, archived: true }),
    [],
  );

  const handleArchive = useCallback(
    async (personaId: number) => {
      const result = await archivePersona(personaId, true);
      if (result.success) loadPersonas();
      return result;
    },
    [loadPersonas],
  );

  const NewPersonaCard = () => (
    <Link
      href="/persona"
      className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px]"
    >
      <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-foreground/20 group-hover:bg-accent transition-all">
        <PlusIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm text-center space-y-1">
        <div className="font-medium">{t("importInterview")}</div>
        <div className="text-xs text-muted-foreground">{t("createNewPersonas")}</div>
      </div>
    </Link>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6">
        {/* Header */}
        <div className="relative text-center space-y-3">
          <div className="absolute right-0 top-0">
            <ArchiveDrawer<PersonaWithStatus>
              fetchArchived={fetchArchived}
              renderItem={(persona, onRefresh) => (
                <ArchivedPersonaItem
                  key={persona.token}
                  persona={persona}
                  onUnarchived={() => {
                    onRefresh();
                    loadPersonas();
                  }}
                />
              )}
            />
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("subtitle")}</p>
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

        {/* Personas Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        ) : personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <NewPersonaCard />
            {personas.map((persona) => (
              <div
                key={persona.token}
                className={cn(
                  "group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300 flex flex-col",
                  persona.personaImportProcessing && "opacity-75 border-amber-500/30",
                )}
              >
                <Link
                  href={persona.personaImportProcessing ? "#" : `/personas/${persona.token}`}
                  className="p-4 flex-1 flex flex-col"
                  onClick={(e) => {
                    if (persona.personaImportProcessing) e.preventDefault();
                  }}
                >
                  {/* Name with avatar prefix */}
                  <div className="flex items-center gap-2 mb-2">
                    <HippyGhostAvatar seed={persona.token} className="size-8 shrink-0" />
                    <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:pr-16 transition-[padding]">
                      {persona.name}
                    </div>
                  </div>

                  {/* Date + source + status */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{persona.source}</span>
                    {persona.personaImportProcessing && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <RefreshCwIcon className="w-3 h-3 animate-spin" />
                          {t("updating")}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 mb-3 flex items-center gap-1.5">
                    {persona.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs text-muted-foreground/60 px-1.5 py-0.5 rounded border border-border/50"
                      >
                        {tag}
                      </span>
                    ))}
                    {persona.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground/50">
                        +{persona.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Footer: tags + arrow on same line */}
                  <div className="flex items-center pt-4 mt-auto border-t border-border/50 gap-1 flex-wrap">
                    <span className="text-muted-foreground/60 text-xs">
                      {formatDate(persona.createdAt, locale)}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                  </div>
                </Link>

                {/* Action buttons — hover only */}
                {!persona.personaImportProcessing && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <ArchiveButton onArchive={() => handleArchive(persona.id)} />
                    <SharePersonaButton persona={{ token: persona.token }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <NewPersonaCard />
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
