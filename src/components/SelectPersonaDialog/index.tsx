import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { EyeIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPersonasWithMeili } from "./actions";

type TPersona = ExtractServerActionData<typeof fetchPersonasWithMeili>[number];

export function SelectPersonaDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (personaTokens: string[]) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("Components.SelectPersonaDialog");

  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [previewPersona, setPreviewPersona] = useState<TPersona | null>(null);
  const [showSelectedList, setShowSelectedList] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(
    async (page: number, search: string, privateMode: boolean) => {
      setLoading(true);
      try {
        const result = await fetchPersonasWithMeili({
          locale,
          searchQuery: search,
          private: privateMode,
          page,
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
    [locale],
  );

  // 初始化：打开时重置状态并加载默认数据
  useEffect(() => {
    if (open) {
      setSelectedTokens([]);
      setSearchQuery("");
      setIsPrivate(false);
      setCurrentPage(1);
      if (inputRef.current) inputRef.current.value = "";
      // 默认加载公开 personas
      loadPersonas(1, "", false);
    }
  }, [open, loadPersonas]);

  // 当 searchQuery、isPrivate 或 currentPage 变化时重新加载
  useEffect(() => {
    if (!open) return;
    loadPersonas(currentPage, searchQuery, isPrivate);
  }, [currentPage, searchQuery, isPrivate, open, loadPersonas]);

  const selectedPersonas = useMemo(
    () => personas.filter((p) => selectedTokens.includes(p.token)),
    [personas, selectedTokens],
  );

  const filterDisplayTags = useCallback(
    (tags: string[]) => tags.filter((tag) => tag?.trim() && tag !== "城市"),
    [],
  );

  const handleSubmit = () => {
    onOpenChange(false);
    onSelect(selectedTokens);
  };

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim() ?? "";
    setCurrentPage(1);
    setSearchQuery(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const togglePersonaSelection = useCallback((token: string) => {
    setSelectedTokens((prev) =>
      prev.includes(token) ? prev.filter((pid) => pid !== token) : [...prev, token],
    );
  }, []);

  const showNoResults = !loading && personas.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:max-w-3xl lg:max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={inputRef} placeholder={t("searchPlaceholder")} className="pl-9" />
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="privateMode"
                checked={isPrivate}
                onCheckedChange={(checked) => {
                  setIsPrivate(checked === true);
                  setCurrentPage(1);
                }}
              />
              <Label htmlFor="privateMode" className="text-sm cursor-pointer">
                {t("showOnlyMyPersonas")}
              </Label>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {loading && currentPage === 1 ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto relative">
                <div className="grid lg:grid-cols-3 gap-4">
                  {loading && currentPage > 1 && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                      <Loader2Icon className="h-8 w-8 animate-spin" />
                    </div>
                  )}

                  {showNoResults ? (
                    <div className="col-span-3 py-12 text-center space-y-2">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("noResultsFound", { query: searchQuery })
                          : isPrivate
                            ? t("noPrivatePersonas")
                            : t("noPersonasAvailable")}
                      </p>
                      {searchQuery && (
                        <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                          {t("clearSearch")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    personas.map((persona) => {
                      const isSelected = selectedTokens.includes(persona.token);
                      const displayTags = filterDisplayTags(persona.tags);

                      return (
                        <Card
                          key={persona.token}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-accent" : "hover:bg-accent/50"
                          }`}
                          onClick={() => togglePersonaSelection(persona.token)}
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
                  disabled={selectedTokens.length === 0}
                >
                  {t("selected")} ({selectedTokens.length})
                </Button>
                <Button onClick={handleSubmit} disabled={selectedTokens.length === 0}>
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

              {previewPersona.tags && previewPersona.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t("tags")}</p>
                  <div className="flex flex-wrap gap-2">
                    {filterDisplayTags(previewPersona.tags).map((tag, idx) => (
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
                  variant={selectedTokens.includes(previewPersona.token) ? "outline" : "default"}
                  onClick={() => togglePersonaSelection(previewPersona.token)}
                >
                  {selectedTokens.includes(previewPersona.token)
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
              {t("selectedPersonasTitle")} ({selectedTokens.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto scrollbar-thin flex-1">
            {selectedPersonas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noSelectedPersonas")}
              </p>
            ) : (
              selectedPersonas.map((persona) => (
                <div key={persona.token} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">{persona.name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewPersona(persona)}>
                        <EyeIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePersonaSelection(persona.token)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {persona.tags && persona.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterDisplayTags(persona.tags).map((tag, idx) => (
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
