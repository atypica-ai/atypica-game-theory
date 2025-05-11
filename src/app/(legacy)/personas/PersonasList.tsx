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
import { Pagination } from "@/components/ui/pagination";
import { UserChatWithMessages } from "@/lib/data/UserChat";
import { cn } from "@/lib/utils";
import { Persona } from "@prisma/client";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchPersonas } from "./actions";

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export default function PersonasList({
  initialPersonas,
  paginationInfo,
  scoutUserChat,
}: {
  initialPersonas: Persona[];
  paginationInfo?: PaginationInfo;
  scoutUserChat?: UserChatWithMessages;
}) {
  const t = useTranslations("PersonasPage");
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>(paginationInfo);
  const [currentPage, setCurrentPage] = useState<number>(paginationInfo?.page || 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
    }
  }, []);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());

    // If there's a scoutUserChat ID, preserve it in the URL
    if (scoutUserChat) {
      url.searchParams.set("scoutUserChat", scoutUserChat.id.toString());
    }

    window.history.pushState({}, "", url.toString());
  }, [currentPage, scoutUserChat]);

  // Fetch personas when page changes
  const fetchPersonasForPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPersonas({
        scoutUserChatId: scoutUserChat?.id,
        page: currentPage,
      });

      if (result.success) {
        setPersonas(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, scoutUserChat?.id]);

  useEffect(() => {
    fetchPersonasForPage();
  }, [fetchPersonasForPage]);

  return (
    <div className={cn("flex-1 overflow-hidden w-full flex flex-col gap-6 p-3 max-w-6xl mx-auto")}>
      <div className="relative w-full mb-4 sm:mb-8">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">{t("title")}</h1>
      </div>
      <div className="flex-1 flex-col gap-6 overflow-y-auto scrollbar-thin">
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

        {scoutUserChat && (
          <div className="flex items-center justify-start gap-3">
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
              className="size-6 p-0"
              onClick={() => {
                router.replace("/personas", { scroll: false });
              }}
            >
              <XIcon className="size-3 text-muted-foreground" />
            </Button>
          </div>
        )}

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
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      ) : pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-center">
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
