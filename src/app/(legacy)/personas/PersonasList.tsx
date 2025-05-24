"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { UserChatWithMessages } from "@/lib/data/UserChat";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchPersonas } from "./actions";

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type TPersona = ExtractServerActionData<typeof fetchPersonas>[number];

export default function PersonasList({
  scoutUserChat,
  initialParams,
}: {
  scoutUserChat?: UserChatWithMessages;
  initialParams: { page?: number; search?: string };
}) {
  const locale = useLocale();
  const t = useTranslations("PersonasPage");
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<TPersona | null>(null);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialParams.page || 1);
  const [searchQuery, setSearchQuery] = useState<string>(initialParams.search || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page and search query from URL on load
  useEffect(() => {
    // 不用 const searchParams = useSearchParams(); 因为 useSearchParams 一开始取值是空的
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get("page");
    const searchParam = url.searchParams.get("search");
    if (pageParam) {
      setCurrentPage(parseInt(pageParam, 10));
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, []);

  // Update URL when page or search changes
  useEffect(() => {
    const url = new URL(window.location.href);

    // Update page parameter
    url.searchParams.set("page", currentPage.toString());

    // Update search parameter
    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }

    // If there's a scoutUserChat ID, preserve it in the URL
    if (scoutUserChat) {
      url.searchParams.set("scoutUserChat", scoutUserChat.id.toString());
    }

    window.history.replaceState({}, "", url.toString());
  }, [currentPage, searchQuery, scoutUserChat]);

  // Fetch personas when page or search query changes
  const fetchPersonasForPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPersonas({
        locale: locale,
        scoutUserChatId: scoutUserChat?.id,
        searchQuery: searchQuery,
        page: currentPage,
      });
      if (!result.success) {
        throw new Error(result.message);
      }
      setPersonas(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, scoutUserChat?.id, locale]);

  useEffect(() => {
    fetchPersonasForPage();
  }, [fetchPersonasForPage]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  // Handle search clear
  const handleClearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin space-y-6 py-10 px-3")}>
      <div className="container mx-auto">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">{t("title")}</h1>
      </div>

      {/* Search Input */}
      <div className="container mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative flex gap-2">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              defaultValue={searchQuery}
              ref={inputRef}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleClearSearch}
                type="button"
              >
                <XIcon className="size-3" />
              </Button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="container mx-auto flex-1 flex-col gap-6 ">
        <div className="mb-8">
          <div className="bg-muted/50 rounded-lg p-6">
            <div className="font-medium mb-2">💡 {t("guide.title")}</div>
            <ul className="text-sm ml-4 list-disc space-y-1 text-muted-foreground">
              <li>
                {t("guide.tip1.1")}
                <Link href="/scout" className="text-blue-500 hover:underline mx-1">
                  {t("guide.tip1.2")}
                </Link>
                {t("guide.tip1.3")}
              </li>
              <li>
                {t("guide.tip2.1")}
                <Link href="/analyst" className="text-blue-500 hover:underline mx-1">
                  {t("guide.tip2.2")}
                </Link>
                {t("guide.tip2.3")}
              </li>
              <li>{t("guide.tip3")}</li>
            </ul>
          </div>
        </div>

        {scoutUserChat && !isLoading && (
          <div className="flex items-center justify-start gap-3 mb-4">
            <div className="flex items-center justify-center size-8 rounded-md border">🔍</div>
            <p className="text-sm text-muted-foreground">
              {t("searchResult")}「
              <span className="truncate inline-block align-bottom max-w-[20ch]">
                {scoutUserChat.title}
              </span>
              」
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                router.replace("/personas", { scroll: false });
              }}
            >
              <XIcon className="size-3 text-muted-foreground" />
            </Button>
          </div>
        )}

        {searchQuery && !isLoading && (
          <div className="flex items-center justify-start gap-3 mb-4">
            <div className="flex items-center justify-center size-8 rounded-md border">🔍</div>
            <p className="text-sm text-muted-foreground">
              {pagination?.totalCount} {t("searchResultsFor")}「{searchQuery}」
            </p>
            <Button variant="ghost" size="icon" onClick={handleClearSearch}>
              <XIcon className="size-3" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <Card
                key={persona.id}
                className="transition-all duration-300 hover:bg-accent/50 cursor-pointer hover:shadow-md"
                onClick={() => setSelectedPersona(persona)}
              >
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{persona.name}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {t("source")}：{persona.source}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="line-clamp-2 text-sm">{persona.prompt}</div>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-wrap gap-1.5">
                    {(persona.tags as string[])?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? t("noSearchResults") : t("noPersonas")}
            </p>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-center mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo(0, 0);
            }}
          />
        </div>
      ) : null}

      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPersona?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("personaDialog.source")}：{selectedPersona?.source}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">{selectedPersona?.prompt}</pre>
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button asChild size="sm">
              <Link href={`/agents/persona/${selectedPersona?.id}`}>chat</Link>
            </Button>
            <div className="flex flex-wrap gap-2">
              {(selectedPersona?.tags as string[])?.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
