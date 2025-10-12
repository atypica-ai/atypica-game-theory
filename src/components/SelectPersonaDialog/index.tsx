import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractServerActionData } from "@/lib/serverAction";
import { BotIcon, EyeIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"public" | "private">("public");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [previewPersona, setPreviewPersona] = useState<TPersona | null>(null);
  const [showSelectedList, setShowSelectedList] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(
    async (page: number, search = "") => {
      setLoading(true);
      try {
        const result = await fetchPersonas({ locale, searchQuery: search, page, mode });
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

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setActiveTags([]);
      setMode("public");
      setCurrentPage(1);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setSearchQuery("");
    setActiveTags([]);
    setCurrentPage(1);
    if (inputRef.current) inputRef.current.value = "";

    if (mode === "private") {
      loadPersonas(1, "");
    } else {
      setPersonas([]);
    }
  }, [mode, open, loadPersonas]);

  useEffect(() => {
    if (!open) return;
    if (mode === "private") {
      loadPersonas(currentPage, "");
    } else if (searchQuery.trim()) {
      loadPersonas(currentPage, searchQuery);
    }
  }, [currentPage, searchQuery, open, loadPersonas, mode]);

  const filteredPersonas = useMemo(() => {
    if (mode !== "public" || activeTags.length === 0) return personas;

    return personas.filter((persona) =>
      activeTags.every((tag) =>
        (persona.tags as string[]).some((t) => t.toLowerCase().includes(tag.toLowerCase())),
      ),
    );
  }, [personas, activeTags, mode]);

  const selectedPersonas = useMemo(
    () => personas.filter((p) => selectedIds.includes(p.id)),
    [personas, selectedIds],
  );

  const filterDisplayTags = useCallback(
    (tags: string[]) => tags.filter((tag) => tag?.trim() && tag !== "城市"),
    [],
  );

  const handleSubmit = () => {
    onOpenChange(false);
    onSelect(selectedIds);
  };

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim() ?? "";
    if (value) {
      setCurrentPage(1);
      setSearchQuery(value);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
    setActiveTags([]);
    setCurrentPage(1);
  }, []);

  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    setActiveTags((prev) => (prev.includes(trimmedTag) ? prev : [...prev, trimmedTag]));
    setSearchQuery(trimmedTag);
    setCurrentPage(1);

    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const newTags = activeTags.filter((t) => t !== tag);
      setActiveTags(newTags);

      if (newTags.length === 0) {
        setSearchQuery("");
        setCurrentPage(1);
      }
    },
    [activeTags],
  );

  const togglePersonaSelection = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  }, []);

  const showEmptyState = mode === "public" && !searchQuery.trim() && activeTags.length === 0;
  const showNoResults = !loading && filteredPersonas.length === 0 && !showEmptyState;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:max-w-3xl lg:max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "public" | "private")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="public">{t("publicPersonas")}</TabsTrigger>
              <TabsTrigger value="private">{t("myPersonas")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "public" && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder={t("searchPlaceholder")}
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.shiftKey) {
                        e.preventDefault();
                        const value = inputRef.current?.value?.trim();
                        if (value) handleAddTag(value);
                      }
                    }}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={handleClearSearch}
                      type="button"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button type="submit">{t("search")}</Button>
              </form>

              {activeTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            {loading && currentPage === 1 && (mode === "private" || !searchQuery) ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin" />
              </div>
            ) : showEmptyState ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <BotIcon className="h-12 w-12 opacity-50" />
                <span className="text-sm">{t("searchFirstPrompt")}</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto relative">
                <div className="grid lg:grid-cols-3 gap-4">
                  {loading && (currentPage > 1 || (mode === "public" && searchQuery)) && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                      <Loader2Icon className="h-8 w-8 animate-spin" />
                    </div>
                  )}

                  {showNoResults ? (
                    <div className="col-span-3 py-12 text-center space-y-2">
                      <p className="text-muted-foreground">
                        {mode === "public" && searchQuery
                          ? t("noResultsFound", { query: searchQuery })
                          : mode === "private"
                            ? t("noPrivatePersonas")
                            : t("noPersonasAvailable")}
                      </p>
                      {mode === "public" && searchQuery && (
                        <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                          {t("clearSearch")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredPersonas.map((persona) => {
                      const isSelected = selectedIds.includes(persona.id);
                      const displayTags = filterDisplayTags(persona.tags as string[]);

                      return (
                        <Card
                          key={persona.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-accent" : "hover:bg-accent/50"
                          }`}
                          onClick={() => togglePersonaSelection(persona.id)}
                        >
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <span className="flex-1 truncate">{persona.name}</span>
                              <Badge variant="secondary">Tier: {persona.tier ?? "N/A"}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPersona(persona);
                                }}
                              >
                                <EyeIcon className="h-3 w-3" />
                              </Button>
                            </CardTitle>
                            {persona.source && (
                              <p className="text-xs text-muted-foreground">
                                Source: {persona.source}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="text-muted-foreground text-xs line-clamp-2">
                            {persona.prompt}
                          </CardContent>
                          <CardFooter>
                            <div className="flex flex-wrap gap-1">
                              {displayTags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex justify-between items-center gap-2 mt-4">
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSelectedList(true)}
                  disabled={selectedIds.length === 0}
                >
                  {t("selected")} ({selectedIds.length})
                </Button>
                <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
                  {t("confirm")}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPersona} onOpenChange={(open) => !open && setPreviewPersona(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewPersona?.name}</DialogTitle>
            {previewPersona?.source && (
              <p className="text-xs text-muted-foreground">
                {t("source")}: {previewPersona.source}
              </p>
            )}
          </DialogHeader>

          {previewPersona && (
            <>
              <div className="flex-1 overflow-y-auto min-h-0">
                <p className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {previewPersona.prompt.trim()}
                </p>
              </div>

              {previewPersona.tags && (previewPersona.tags as string[]).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t("tags")}</p>
                  <div className="flex flex-wrap gap-2">
                    {filterDisplayTags(previewPersona.tags as string[]).map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  size="sm"
                  variant={selectedIds.includes(previewPersona.id) ? "outline" : "default"}
                  onClick={() => togglePersonaSelection(previewPersona.id)}
                >
                  {selectedIds.includes(previewPersona.id)
                    ? t("removeFromSelection")
                    : t("addToSelection")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Selected List Dialog */}
      <Dialog open={showSelectedList} onOpenChange={setShowSelectedList}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("selectedPersonasTitle")} ({selectedIds.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto scrollbar-thin flex-1">
            {selectedPersonas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noSelectedPersonas")}
              </p>
            ) : (
              selectedPersonas.map((persona) => (
                <div key={persona.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">{persona.name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewPersona(persona)}>
                        <EyeIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePersonaSelection(persona.id)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {persona.tags && (persona.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterDisplayTags(persona.tags as string[]).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <Button variant="outline" onClick={() => setShowSelectedList(false)}>
            {t("close")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
