import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchPersonas } from "./actions";

interface SelectPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (personaIds: number[]) => void;
}

type TPersona = ExtractServerActionData<typeof fetchPersonas>[number];

export function SelectPersonaDialog({ open, onOpenChange, onSelect }: SelectPersonaDialogProps) {
  const locale = useLocale();
  const t = useTranslations("Components.SelectPersonaDialog");
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mode, setMode] = useState<"public" | "private">("public");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(
    async (page: number, search: string = "") => {
      setLoading(true);
      try {
        const result = await fetchPersonas({
          locale: locale,
          searchQuery: search,
          page,
          mode,
        });
        if (!result.success) throw result;
        setPersonas(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
        }
      } finally {
        setLoading(false);
      }
    },
    [locale, mode],
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setSearchQuery("");
      setMode("public");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setCurrentPage(1);
    }
  }, [open]);

  // Reset search and page when mode changes, then load personas
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setCurrentPage(1);
      loadPersonas(1, "");
    }
  }, [mode, open, loadPersonas]);

  // Load personas when page or search changes
  useEffect(() => {
    if (open) {
      loadPersonas(currentPage, mode === "private" ? "" : searchQuery);
    }
  }, [currentPage, searchQuery, open, loadPersonas, mode]);

  const handleSubmit = async () => {
    try {
      onOpenChange(false);
      onSelect(selectedIds);
    } catch (error) {
      toast.error(`无法保存访谈对象 ${error}`);
    }
  };

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  const handleClearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Display search results status
  const renderSearchStatus = () => {
    if (!searchQuery) return null;

    return (
      <div className="flex items-center justify-start gap-3 mt-4">
        <div className="flex items-center justify-center size-8 rounded-md border">🔍</div>
        <p className="text-sm text-muted-foreground">Search results for「{searchQuery}」</p>
        <Button variant="ghost" size="icon" onClick={handleClearSearch}>
          <XIcon className="size-3" />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-3xl lg:max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "public" | "private")}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public">Public Personas</TabsTrigger>
            <TabsTrigger value="private">My Personas</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "public" && (
          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <div className="flex-1 relative flex gap-2">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search personas..."
                defaultValue={searchQuery}
                ref={inputRef}
                className="pl-9 pr-9"
                aria-label="Search personas by name or tags"
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
        )}
        {mode === "public" && renderSearchStatus()}

        <div className="flex-1 flex flex-col min-h-0">
          {loading && currentPage === 1 && (mode === "private" || !searchQuery) ? (
            <div className="flex-1 flex justify-center items-center">
              <Loader2Icon className="size-8 animate-spin mx-auto mb-4" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-thin relative min-h-0">
                <div className="grid lg:grid-cols-3 gap-4 mt-4">
                  {loading && (currentPage > 1 || (mode === "public" && searchQuery)) && (
                    <div className="absolute inset-0 bg-background/80 flex justify-center items-center z-10">
                      <Loader2Icon className="size-8 animate-spin mx-auto mb-4" />
                    </div>
                  )}
                  {personas.length === 0 && !loading ? (
                    <div className="col-span-3 py-12 text-center">
                      <p className="text-muted-foreground">
                        {mode === "public" && searchQuery
                          ? `No results found for "${searchQuery}"`
                          : mode === "private"
                            ? "No private personas available"
                            : "No personas available"}
                      </p>
                      {mode === "public" && searchQuery && (
                        <Button
                          variant="ghost"
                          onClick={handleClearSearch}
                          size="sm"
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    personas.map((persona) => (
                      <Card
                        key={persona.id}
                        className={`gap-3 cursor-pointer transition-colors duration-300 ${
                          selectedIds.includes(persona.id) ? "bg-accent" : "hover:bg-accent/50"
                        } hover:shadow-md`}
                        onClick={() => {
                          setSelectedIds((prev) =>
                            prev.includes(persona.id)
                              ? prev.filter((id) => id !== persona.id)
                              : [...prev, persona.id],
                          );
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center overflow-hidden gap-1">
                            <div className="flex-1 truncate">{persona.name}</div>
                            <Badge variant="secondary" className="whitespace-nowrap text-xs">
                              Tier: {persona.tier ?? "N/A"}
                            </Badge>
                          </CardTitle>
                          {persona.source && (
                            <div className="text-xs text-muted-foreground">
                              Source：{persona.source}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="text-muted-foreground text-xs line-clamp-2">
                          {persona.prompt}
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {(persona.tags as string[])?.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-muted px-1.5 py-0.5 rounded text-xs inline-block"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-between items-center mt-4 flex-shrink-0">
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                )}
                <div className="flex space-x-2 ml-auto">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
                    {t("confirm")} ({selectedIds.length})
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
