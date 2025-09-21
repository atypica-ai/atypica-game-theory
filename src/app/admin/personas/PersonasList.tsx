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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { UserChat } from "@/prisma/client";
import { EyeIcon, FileTextIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createOrGetUserPersonaChat } from "../../(persona)/actions";
import { fetchPersonas, rescorePersona } from "./actions";

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
  scoutUserChat?: UserChat;
  initialParams: Record<string, string | number>;
}) {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<TPersona | null>(null);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rescoringId, setRescoringId] = useState<number | null>(null);
  const [chatCreating, setChatCreating] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Use query params hook for URL synchronization
  type PersonasListSearchParams = {
    page: number;
    search: string;
    tiers: number[];
    locales: string[];
  };

  const {
    values: {
      page: currentPage,
      search: searchQuery,
      tiers: selectedTiers,
      locales: selectedLocales,
    },
    setParam,
    setParams,
  } = useListQueryParams<PersonasListSearchParams>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
      tiers: createParamConfig.numberArray([2, 3]),
      locales: createParamConfig.stringArray(["zh-CN", "en-US"]),
    },
    initialValues: (({ tiers, locales, ...rest }) => ({
      tiers: tiers && typeof tiers === "string" ? tiers.split(",").map(Number) : undefined,
      locales: locales && typeof locales === "string" ? locales.split(",") : undefined,
      ...rest,
    }))(initialParams),
  });

  // Preserve scoutUserChat in URL if present
  useEffect(() => {
    if (scoutUserChat) {
      const url = new URL(window.location.href);
      url.searchParams.set("scoutUserChat", scoutUserChat.id.toString());
      window.history.replaceState({}, "", url.toString());
    }
  }, [scoutUserChat]);

  // Fetch personas when params change
  const fetchPersonasForPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPersonas({
        locales: selectedLocales,
        tiers: selectedTiers,
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
      console.log("Failed to fetch personas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, scoutUserChat?.id, selectedTiers, selectedLocales]);

  useEffect(() => {
    fetchPersonasForPage();
  }, [fetchPersonasForPage]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  // Handle search clear
  const handleClearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setParams({ search: "", page: 1 });
  };

  const handleRescore = async (personaId: number) => {
    setRescoringId(personaId);
    try {
      const result = await rescorePersona(personaId);
      if (result.success) {
        // Refresh the list after a successful rescore
        await fetchPersonasForPage();
      } else {
        alert(`Rescoring failed: ${result.message}`);
      }
    } catch (error) {
      alert(`An error occurred: ${(error as Error).message}`);
    } finally {
      setRescoringId(null);
    }
  };

  const handleStartChat = async (personaId: number) => {
    setChatCreating((prev) => ({ ...prev, [personaId]: true }));
    try {
      const result = await createOrGetUserPersonaChat(personaId);
      if (!result.success) {
        throw new Error(result.message);
      }
      router.push(`/persona/chat/${result.data.token}`);
    } catch (error) {
      console.log("Failed to start chat:", error);
      toast.error("Failed to start chat");
    } finally {
      setChatCreating((prev) => ({ ...prev, [personaId]: false }));
    }
  };

  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin space-y-6")}>
      <div className="container mx-auto">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">Personas</h1>
      </div>

      {/* Search Input */}
      <div className="container mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative flex gap-2">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personas..."
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

        {/* Filters */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Tiers</Label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((tier) => (
                  <div key={tier} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tier-${tier}`}
                      checked={selectedTiers.includes(tier)}
                      onCheckedChange={(checked) => {
                        const newTiers = checked
                          ? [...selectedTiers, tier]
                          : selectedTiers.filter((t) => t !== tier);
                        setParams({ tiers: newTiers, page: 1 });
                      }}
                    />
                    <Label htmlFor={`tier-${tier}`} className="text-sm">
                      Tier {tier}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Languages</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: "zh-CN", label: "中文" },
                  { code: "en-US", label: "English" },
                ].map((lang) => (
                  <div key={lang.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang.code}`}
                      checked={selectedLocales.includes(lang.code)}
                      onCheckedChange={(checked) => {
                        const newLocales = checked
                          ? [...selectedLocales, lang.code]
                          : selectedLocales.filter((l) => l !== lang.code);
                        setParams({ locales: newLocales, page: 1 });
                      }}
                    />
                    <Label htmlFor={`lang-${lang.code}`} className="text-sm">
                      {lang.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex-1 flex-col gap-6 ">
        {scoutUserChat && !isLoading && (
          <div className="flex items-center justify-start gap-3 mb-4">
            <div className="flex items-center justify-center size-8 rounded-md border">🔍</div>
            <p className="text-sm text-muted-foreground">
              Search result for「
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
              {pagination?.totalCount} results for「{searchQuery}」
            </p>
            <Button variant="ghost" size="icon" onClick={handleClearSearch}>
              <XIcon className="size-3" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2Icon className="size-8 animate-spin mx-auto mb-4" />
          </div>
        ) : personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <Card key={persona.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg overflow-hidden">
                    <span className="truncate flex-1">{persona.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2 ml-2 flex-shrink-0"
                      onClick={() => setSelectedPersona(persona)}
                    >
                      <EyeIcon className="size-3" />
                      <span>View</span>
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    <div>Source：{persona.source}</div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="whitespace-nowrap text-xs">
                        Tier: {persona.tier ?? "N/A"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs h-5"
                        disabled={rescoringId === persona.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRescore(persona.id);
                        }}
                      >
                        {rescoringId === persona.id ? "Scoring..." : "Re-score"}
                      </Button>
                      {persona.tier === 3 && persona.personaImport && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-5 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/persona/import/${persona.personaImport?.id}`, "_blank");
                            }}
                          >
                            <FileTextIcon className="size-3" />
                            Import
                          </Button>
                          {persona.personaImport.user?.email && (
                            <Badge variant="outline" className="whitespace-nowrap text-xs">
                              {persona.personaImport.user.email}
                            </Badge>
                          )}
                          {persona.personaImport.analysis &&
                            typeof persona.personaImport.analysis === "object" &&
                            persona.personaImport.analysis !== null &&
                            "score" in persona.personaImport.analysis &&
                            typeof (persona.personaImport.analysis as { score?: number }).score ===
                              "number" && (
                              <Badge variant="default" className="whitespace-nowrap text-xs">
                                Score:{" "}
                                {(
                                  persona.personaImport.analysis as { score: number }
                                ).score.toFixed(1)}
                              </Badge>
                            )}
                        </>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="line-clamp-4 text-xs text-muted-foreground">{persona.prompt}</div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
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
              {searchQuery ? "No search results found" : "No personas available"}
            </p>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setParam("page", page);
              window.scrollTo(0, 0);
            }}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()}
          </div>
        </div>
      ) : null}

      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPersona?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Source：{selectedPersona?.source}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">{selectedPersona?.prompt}</pre>
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button
              size="sm"
              onClick={() => selectedPersona && handleStartChat(selectedPersona.id)}
              disabled={selectedPersona ? chatCreating[selectedPersona.id] : false}
            >
              {selectedPersona && chatCreating[selectedPersona.id] ? "Starting..." : "Chat"}
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
