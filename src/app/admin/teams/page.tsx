"use client";
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
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { CoinsIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { addTokensToTeam, fetchTeams } from "./actions";

type Team = ExtractServerActionData<typeof fetchTeams>[number];

export default function TeamsPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [tokensToAdd, setTokensToAdd] = useState<number | null>(1_000_000);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");

      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  // Update URL when page or search changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());

    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }

    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTeams(currentPage, 10, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setTeams(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/teams");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  const handleAddTokens = async () => {
    if (!selectedTeam || !tokensToAdd) return;
    setIsSubmitting(true);
    setError("");
    try {
      await addTokensToTeam(selectedTeam.id, tokensToAdd);
      setIsDialogOpen(false);
      fetchData(); // Refresh the list
    } catch (err) {
      setError((err as Error).message);
    }
    setIsSubmitting(false);
  };

  const openTokensDialog = (team: Team) => {
    setSelectedTeam(team);
    setTokensToAdd(1_000_000);
    setIsDialogOpen(true);
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Teams Management</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={searchQuery}
              ref={inputRef}
              placeholder="Search by name..."
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
                setSearchQuery("");
                setCurrentPage(1);
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
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead></TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm">
                  No teams found
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id.toString()}>
                  <TableCell className="whitespace-nowrap text-sm">{team.id}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{team.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {team.ownerUser.email}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {formatTokensNumber(
                      team.tokens ? team.tokens.permanentBalance + team.tokens.monthlyBalance : 0,
                    )}{" "}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {(team.tokens
                        ? team.tokens.permanentBalance + team.tokens.monthlyBalance
                        : 0
                      ).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs text-amber-500 hover:text-amber-500 gap-0"
                      onClick={() => openTokensDialog(team)}
                      title="Add tokens"
                    >
                      <PlusIcon className="size-3" />
                      <CoinsIcon className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <div>{formatDate(team.createdAt, locale)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tokens</DialogTitle>
            <DialogDescription>Add bonus tokens to {selectedTeam?.name}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Balance</Label>
              <div className="col-span-3 text-sm">
                {(selectedTeam?.tokens
                  ? selectedTeam.tokens.permanentBalance + selectedTeam.tokens.monthlyBalance
                  : 0
                ).toLocaleString()}{" "}
                tokens
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admin-add-tokens-input" className="text-right">
                Tokens
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="admin-add-tokens-input"
                  type="number"
                  min="1"
                  value={tokensToAdd ?? ""}
                  onChange={(e) => setTokensToAdd(e.target.value ? parseInt(e.target.value) : null)}
                  className="font-mono"
                />
                <div className="text-xs text-muted-foreground">
                  {tokensToAdd ? `${formatTokensNumber(tokensToAdd)} tokens will be added` : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[100000, 500000, 1000000, 2000000, 5000000, 10000000].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTokensToAdd(amount)}
                  className="text-xs h-7"
                >
                  {formatTokensNumber(amount)}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTokens}
              disabled={isSubmitting || !tokensToAdd || tokensToAdd <= 0}
            >
              {isSubmitting ? "Adding..." : "Add Tokens"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
