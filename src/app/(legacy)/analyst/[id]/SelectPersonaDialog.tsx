import { upsertAnalystInterview } from "@/app/(legacy)/interview/actions";
import { fetchPersonas } from "@/app/(legacy)/personas/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface SelectPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analystId: number;
  onSuccess: () => void;
}

type TPersona = ExtractServerActionData<typeof fetchPersonas>[number];

export function SelectPersonaDialog({
  open,
  onOpenChange,
  analystId,
  onSuccess,
}: SelectPersonaDialogProps) {
  const t = useTranslations("AnalystPage.SelectPersonaDialog");
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(async (page: number, search: string = "") => {
    setLoading(true);
    try {
      const result = await fetchPersonas({
        page,
        searchQuery: search,
      });
      if (!result.success) throw result;
      setPersonas(result.data);
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setSearchQuery("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      loadPersonas(1, "");
      setCurrentPage(1);
    }
  }, [open, loadPersonas]);

  useEffect(() => {
    if (open) {
      loadPersonas(currentPage, searchQuery);
    }
  }, [currentPage, searchQuery, open, loadPersonas]);

  const handleSubmit = async () => {
    try {
      for (const personaId of selectedIds) {
        await upsertAnalystInterview({ analystId, personaId });
      }
      onOpenChange(false);
      onSuccess();
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
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
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
        {renderSearchStatus()}
        {loading && currentPage === 1 && !searchQuery ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mt-4 max-h-[60vh] overflow-y-auto relative">
              {loading && (currentPage > 1 || searchQuery) && (
                <div className="absolute inset-0 bg-background/80 flex justify-center items-center z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              )}
              {personas.length === 0 && !loading ? (
                <div className="col-span-4 py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? `No results found for "${searchQuery}"`
                      : "No personas available"}
                  </p>
                  {searchQuery && (
                    <Button variant="ghost" onClick={handleClearSearch} size="sm" className="mt-2">
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
                      <CardTitle className="truncate">{persona.name}</CardTitle>
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
            <div className="flex justify-between items-center mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
