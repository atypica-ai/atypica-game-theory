"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { CoinsIcon, PlusIcon, SearchIcon, TrashIcon, UsersIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { addTokensToTeam, deleteTeam, fetchTeams, updateTeamSeats, updateTeamUnlimitedSeats } from "./actions";

type Team = ExtractServerActionData<typeof fetchTeams>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
} as const;

export type TeamsSearchParams = {
  page: number;
  search: string;
};

interface TeamsPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function TeamsPageClient({ initialSearchParams }: TeamsPageClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // State for tokens dialog
  const [tokensToAdd, setTokensToAdd] = useState<number | null>(1_000_000);
  const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);

  // State for seats dialog
  const [seatsToUpdate, setSeatsToUpdate] = useState<number | null>(null);
  const [isSeatsDialogOpen, setIsSeatsDialogOpen] = useState(false);
  const [unlimitedSeats, setUnlimitedSeats] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<TeamsSearchParams>({
    params: {
      page: createParamConfig.number(1),
      search: createParamConfig.string(""),
    },
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
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

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  const handleAddTokens = async () => {
    if (!selectedTeam || !tokensToAdd) return;
    setIsSubmitting(true);
    setError("");
    const result = await addTokensToTeam(selectedTeam.id, tokensToAdd);
    if (!result.success) {
      setError(result.message);
    } else {
      setIsTokensDialogOpen(false);
      fetchData(); // Refresh the list
    }
    setIsSubmitting(false);
  };

  const handleUpdateSeats = async () => {
    if (!selectedTeam || seatsToUpdate === null) return;
    setIsSubmitting(true);
    setError("");

    // Update unlimited seats flag first
    const unlimitedResult = await updateTeamUnlimitedSeats(selectedTeam.id, unlimitedSeats);
    if (!unlimitedResult.success) {
      setError(unlimitedResult.message);
      setIsSubmitting(false);
      return;
    }

    // Update seats number
    const result = await updateTeamSeats(selectedTeam.id, seatsToUpdate);
    if (!result.success) {
      setError(result.message);
    } else {
      setIsSeatsDialogOpen(false);
      fetchData(); // Refresh the list
    }
    setIsSubmitting(false);
  };

  const handleDeleteTeam = async (teamId: number) => {
    setError("");
    const result = await deleteTeam(teamId);
    if (!result.success) {
      setError(result.message);
    } else {
      fetchData(); // Refresh the list
    }
  };

  const openTokensDialog = (team: Team) => {
    setSelectedTeam(team);
    setTokensToAdd(1_000_000);
    setError("");
    setIsTokensDialogOpen(true);
  };

  const openSeatsDialog = (team: Team) => {
    setSelectedTeam(team);
    setSeatsToUpdate(team.seats);
    const teamExtra = team.extra as { unlimitedSeats?: boolean } | null;
    setUnlimitedSeats(teamExtra?.unlimitedSeats === true);
    setError("");
    setIsSeatsDialogOpen(true);
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Teams Management</h1>
      {error && !isSeatsDialogOpen && !isTokensDialogOpen && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>
      )}

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
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Members / Seats</TableHead>
              <TableHead>⚙️</TableHead>
              <TableHead className="text-right">Subscriptions</TableHead>
              <TableHead className="text-right">Payments</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead>⚙️</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>⚙️</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-sm">
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
                    {team._count.members} / {team.seats}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-blue-500 hover:text-blue-500"
                      onClick={() => openSeatsDialog(team)}
                      title="Edit seats"
                    >
                      <PlusIcon className="size-3" />
                      <UsersIcon className="size-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {team._count.subscriptions}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {team._count.paymentRecords}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {formatTokensNumber(
                      team.tokensAccount
                        ? team.tokensAccount.permanentBalance + team.tokensAccount.monthlyBalance
                        : 0,
                    )}{" "}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {(team.tokensAccount
                        ? team.tokensAccount.permanentBalance + team.tokensAccount.monthlyBalance
                        : 0
                      ).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-0 px-1.5 text-xs text-amber-500 hover:text-amber-500"
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
                  <TableCell className="whitespace-nowrap text-sm">
                    <ConfirmDialog
                      title="Delete Team"
                      description={`Are you sure you want to delete team "${team.name}"? This action cannot be undone. Team must have no subscriptions, payments, or token logs to be deleted.`}
                      onConfirm={() => handleDeleteTeam(team.id)}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 gap-0 px-1.5 text-xs text-red-500 hover:text-red-500"
                        title="Delete team"
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </ConfirmDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
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

      {/* Tokens Dialog */}
      <Dialog open={isTokensDialogOpen} onOpenChange={setIsTokensDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tokens</DialogTitle>
            <DialogDescription>Add bonus tokens to {selectedTeam?.name}</DialogDescription>
          </DialogHeader>

          {error && isTokensDialogOpen && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Balance</Label>
              <div className="col-span-3 text-sm">
                {(selectedTeam?.tokensAccount
                  ? selectedTeam.tokensAccount.permanentBalance +
                    selectedTeam.tokensAccount.monthlyBalance
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
                  className="h-7 text-xs"
                >
                  {formatTokensNumber(amount)}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTokensDialogOpen(false)}>
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

      {/* Seats Dialog */}
      <Dialog open={isSeatsDialogOpen} onOpenChange={setIsSeatsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Seats</DialogTitle>
            <DialogDescription>
              Modify the number of seats for {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>

          {error && isSeatsDialogOpen && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</div>
          )}

          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              ⚠️ Note: Seats will be overridden by active subscription at monthly token reset. You can enable unlimited seats to bypass the seat limit when adding members.
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Members</Label>
              <div className="col-span-3 text-sm">
                {selectedTeam?._count.members} current members
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admin-update-seats-input" className="text-right">
                Seats
              </Label>
              <div className="col-span-3">
                <Input
                  id="admin-update-seats-input"
                  type="number"
                  min={selectedTeam?._count.members ?? 1}
                  value={seatsToUpdate ?? ""}
                  onChange={(e) =>
                    setSeatsToUpdate(e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="font-mono"
                  disabled={unlimitedSeats}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Unlimited</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox
                  id="admin-unlimited-seats-checkbox"
                  checked={unlimitedSeats}
                  onCheckedChange={(checked) => setUnlimitedSeats(checked === true)}
                />
                <label
                  htmlFor="admin-unlimited-seats-checkbox"
                  className="text-sm text-muted-foreground"
                >
                  Allow unlimited seats (no seat limit when adding members)
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSeatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSeats}
              disabled={
                isSubmitting ||
                seatsToUpdate === null ||
                seatsToUpdate < (selectedTeam?._count.members ?? 0)
              }
            >
              {isSubmitting ? "Updating..." : "Update Seats"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
