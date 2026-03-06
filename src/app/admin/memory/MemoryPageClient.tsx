"use client";

import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { EyeIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchAllMemories, reorganizeMemoryVersion } from "./actions";

type Memory = ExtractServerActionData<typeof fetchAllMemories>[number];
type SelectedMemory = Memory & { viewType: "core" | "working" };

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
} as const;

export type MemorySearchParams = {
  page: number;
  search: string;
};

interface MemoryPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function MemoryPageClient({ initialSearchParams }: MemoryPageClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<SelectedMemory | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<MemorySearchParams>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
    },
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchAllMemories(currentPage, 10, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setMemories(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/memory");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  const handleViewCore = (memory: Memory) => {
    setSelectedMemory({ ...memory, viewType: "core" });
    setIsViewDialogOpen(true);
  };

  const handleViewWorking = (memory: Memory) => {
    setSelectedMemory({ ...memory, viewType: "working" });
    setIsViewDialogOpen(true);
  };

  const handleReorganize = useCallback(
    async (memory: Memory) => {
      setIsLoading(true);
      const result = await reorganizeMemoryVersion({
        userId: memory.userId ?? undefined,
        teamId: memory.teamId ?? undefined,
      });

      if (!result.success) {
        setError(result.message ?? "Failed to reorganize memory");
      } else {
        // Refresh list to show new version
        await fetchData();
      }
      setIsLoading(false);
    },
    [fetchData],
  );

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Memory Management</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={searchQuery}
              ref={inputRef}
              placeholder="Search by user email or team name..."
              className="pl-8"
            />
          </div>
          <Button type="submit">Search</Button>
          {searchQuery && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
                setParams({ search: "", page: 1 });
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      <div className="mb-4 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User/Team</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Core Len</TableHead>
              <TableHead>Work Len</TableHead>
              <TableHead>Change Notes</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memories.map((memory) => (
              <TableRow key={memory.id}>
                <TableCell>
                  {memory.userEmail ? (
                    <div>
                      <div className="text-sm font-medium">{memory.userEmail}</div>
                      <div className="text-xs text-muted-foreground">User ID: {memory.userId}</div>
                    </div>
                  ) : memory.teamName ? (
                    <div>
                      <div className="text-sm font-medium">{memory.teamName}</div>
                      <div className="text-xs text-muted-foreground">Team ID: {memory.teamId}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{memory.version}</TableCell>
                <TableCell className="text-sm">{memory.core.length} charactors</TableCell>
                <TableCell className="text-sm">{memory.working.length} items</TableCell>
                <TableCell className="text-sm max-w-md truncate">
                  {memory.changeNotes || "-"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(memory.createdAt, locale)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(memory.updatedAt, locale)}
                </TableCell>
                <TableCell className="text-right flex gap-1 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleViewCore(memory)}
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    Core
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleViewWorking(memory)}
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    Working
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleReorganize(memory)}
                  >
                    Reorg
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
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

      {/* View Dialog - same width as Capabilities page dialog, read-only */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Memory Version {selectedMemory?.version}
              {selectedMemory?.userEmail && ` - ${selectedMemory.userEmail}`}
              {selectedMemory?.teamName && ` - ${selectedMemory.teamName}`}
            </DialogTitle>
            <DialogDescription>
              Created: {selectedMemory && formatDate(selectedMemory.createdAt, locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMemory?.changeNotes && (
              <div>
                <Label>Change Notes</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedMemory.changeNotes}</p>
              </div>
            )}
            {selectedMemory && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {selectedMemory.viewType === "core" ? "Core" : "Working"}
                  Content (
                  {selectedMemory.viewType === "core"
                    ? selectedMemory.core.length + " characters"
                    : selectedMemory.working.length + " items"}{" "}
                  )
                </div>
                <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                  {selectedMemory.viewType === "core"
                    ? selectedMemory.core
                    : selectedMemory.working.join("\n")}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
