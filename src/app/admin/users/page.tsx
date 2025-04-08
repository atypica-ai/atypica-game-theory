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
import { ExtractServerActionData } from "@/lib/serverAction";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../utils";
import { addPointsToUser, fetchUsers } from "./actions";

type User = ExtractServerActionData<typeof fetchUsers>[number];

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number | null>(100);
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
    const result = await fetchUsers(currentPage, 10, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setUsers(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/users");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  const handleAddPoints = async () => {
    if (!selectedUser || !pointsToAdd) return;
    setIsSubmitting(true);
    setError("");
    try {
      await addPointsToUser(selectedUser.id, pointsToAdd);
      setIsDialogOpen(false);
      fetchData(); // Refresh the list
    } catch (err) {
      setError((err as Error).message);
    }
    setIsSubmitting(false);
  };

  const openPointsDialog = (user: User) => {
    setSelectedUser(user);
    setPointsToAdd(100);
    setIsDialogOpen(true);
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users Management</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={searchQuery}
              ref={inputRef}
              placeholder="Search by email..."
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
        <table className="min-w-full divide-y divide">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Points (100 points per study)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id.toString()}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{user.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {user.points?.balance ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Button variant="outline" size="sm" onClick={() => openPointsDialog(user)}>
                      Add Points
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Points</DialogTitle>
            <DialogDescription>Add bonus points to {selectedUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Balance</Label>
              <div className="col-span-3 text-sm">{selectedUser?.points?.balance ?? 0} points</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Points
              </Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={pointsToAdd ?? ""}
                onChange={(e) => setPointsToAdd(e.target.value ? parseInt(e.target.value) : null)}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPoints}
              disabled={isSubmitting || !pointsToAdd || pointsToAdd <= 0}
            >
              {isSubmitting ? "Adding..." : "Add Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
