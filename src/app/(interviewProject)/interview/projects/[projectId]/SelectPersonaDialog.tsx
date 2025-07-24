import {
  createPersonaInterviewSession,
  fetchAvailablePersonas,
} from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface SelectPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess: () => void;
}

interface Persona {
  id: number;
  name: string;
  prompt: string;
  source: string;
  tags: string[];
}

export function SelectPersonaDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: SelectPersonaDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(async (page: number, search: string = "") => {
    setLoading(true);
    try {
      const result = await fetchAvailablePersonas({
        searchQuery: search.trim() || undefined,
        page,
        pageSize: 12,
      });
      if (!result.success) throw new Error(result.message);

      setPersonas(result.data);
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      toast.error(`Failed to load personas: ${error}`);
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
    if (selectedIds.length === 0) {
      toast.error("Please select at least one persona");
      return;
    }

    setCreating(true);
    try {
      let lastSessionResult = null;

      // Create interview sessions for all selected personas
      for (const personaId of selectedIds) {
        const result = await createPersonaInterviewSession({
          projectId,
          personaId,
        });

        if (!result.success) {
          throw new Error(result.message || "Failed to create interview session");
        }

        lastSessionResult = result;
      }

      // If only one persona selected, ask if user wants to start immediately
      if (selectedIds.length === 1 && lastSessionResult) {
        const shouldStartNow = window.confirm(
          "Interview session created successfully! Would you like to start the interview now?",
        );

        if (shouldStartNow) {
          onOpenChange(false);
          router.push(`/chat/${lastSessionResult.data.chatToken}`);
          return;
        }
      }

      toast.success(
        selectedIds.length === 1
          ? "Interview session created successfully"
          : `${selectedIds.length} interview sessions created successfully`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(`Failed to create interview sessions: ${error}`);
    } finally {
      setCreating(false);
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
      <DialogContent className="md:max-w-3xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Select AI Personas to Interview</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <div className="flex-1 relative flex gap-2">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personas by name, description, or source..."
              defaultValue={searchQuery}
              ref={inputRef}
              className="pl-9 pr-9"
              aria-label="Search personas by name or description"
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
            <div className="grid lg:grid-cols-3 gap-4 mt-4 max-h-[60vh] overflow-y-auto scrollbar-thin relative">
              {loading && (currentPage > 1 || searchQuery) && (
                <div className="absolute inset-0 bg-background/80 flex justify-center items-center z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              )}
              {personas.length === 0 && !loading ? (
                <div className="col-span-3 py-12 text-center">
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
                          Source: {persona.source}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-xs line-clamp-2">
                      {persona.prompt}
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {persona.tags?.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-muted px-1.5 py-0.5 rounded text-xs inline-block"
                          >
                            {tag}
                          </span>
                        ))}
                        {persona.tags?.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{persona.tags.length - 3} more
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span>Click to select</span>
                        {selectedIds.includes(persona.id) && (
                          <span className="text-primary font-medium">✓ Selected</span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center mt-4">
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
              <div className="flex space-x-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={selectedIds.length === 0 || creating}>
                  {creating
                    ? "Creating..."
                    : `Create Interview${selectedIds.length > 1 ? "s" : ""} (${selectedIds.length})`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
