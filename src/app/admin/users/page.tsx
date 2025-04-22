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
import { formatTokensNumber } from "@/lib/utils";
import { AdminRole } from "@prisma/client";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AdminPermission, PaginationInfo } from "../utils";
import {
  addTokensToUser,
  deleteUserAccount,
  fetchUsers,
  updateAdminStatus,
  verifyUserEmail,
} from "./actions";

type User = ExtractServerActionData<typeof fetchUsers>[number];

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tokensToAdd, setTokensToAdd] = useState<number | null>(1_000_000);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole>("REGULAR_ADMIN");
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");
      const adminParam = url.searchParams.get("adminOnly");

      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
      if (adminParam === "true") {
        setAdminOnly(true);
      }
    }
  }, []);

  // Update URL when page, search, or admin filter changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());

    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }

    if (adminOnly) {
      url.searchParams.set("adminOnly", "true");
    } else {
      url.searchParams.delete("adminOnly");
    }

    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery, adminOnly]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchUsers(currentPage, 10, searchQuery, adminOnly);
    if (!result.success) {
      setError(result.message);
    } else {
      setUsers(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, adminOnly]);

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

  const handleAddTokens = async () => {
    if (!selectedUser || !tokensToAdd) return;
    setIsSubmitting(true);
    setError("");
    try {
      await addTokensToUser(selectedUser.id, tokensToAdd);
      setIsDialogOpen(false);
      fetchData(); // Refresh the list
    } catch (err) {
      setError((err as Error).message);
    }
    setIsSubmitting(false);
  };

  const openTokensDialog = (user: User) => {
    setSelectedUser(user);
    setTokensToAdd(1_000_000);
    setIsDialogOpen(true);
  };
  const openAdminDialog = (user: User) => {
    setSelectedUser(user);
    if (user.adminUser) {
      setSelectedRole(user.adminUser.role);
      setSelectedPermissions(user.adminUser.permissions);
    } else {
      setSelectedRole("REGULAR_ADMIN");
      setSelectedPermissions([]);
    }
    setIsAdminDialogOpen(true);
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

        <div className="mt-4 flex items-center space-x-2">
          <input
            type="checkbox"
            id="adminOnly"
            checked={adminOnly}
            onChange={(e) => {
              setAdminOnly(e.target.checked);
              setCurrentPage(1); // Reset to first page when toggling filter
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="adminOnly" className="text-sm font-medium">
            Show admin users only
          </label>
        </div>
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
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Verified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Admin Role
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id.toString()}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{user.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                    {formatTokensNumber(user.tokens?.balance ?? 0)} <br />
                    <span className="text-xs text-muted-foreground">
                      {(user.tokens?.balance ?? 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => openTokensDialog(user)}
                      title="Add tokens"
                    >
                      Add Tokens
                    </Button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {new Date(user.emailVerified).toLocaleDateString()}
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Not Verified
                          </span>
                          <ConfirmDialog
                            title="Verify User Email"
                            description={`Are you sure you want to mark ${user.email} as verified?`}
                            onConfirm={async () => {
                              await verifyUserEmail(user.id);
                              fetchData();
                            }}
                          >
                            <Button variant="outline" size="icon" className="size-7">
                              ✓
                            </Button>
                          </ConfirmDialog>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {user.lastLogin ? (
                      <>
                        <div>{new Date(user.lastLogin.timestamp).toLocaleDateString()}</div>
                        <div>{user.lastLogin.clientIp}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {user.adminUser ? (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.adminUser.role}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => openAdminDialog(user)}
                          >
                            Edit
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => openAdminDialog(user)}
                        >
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <ConfirmDialog
                      title="Delete User Account"
                      description={`Are you sure you want to permanently delete the account for ${user.email}? This will remove all user data including tokens, payments, and subscription information.`}
                      onConfirm={async () => {
                        const result = await deleteUserAccount(user.id);
                        if (!result.success) {
                          setError(result.message || "Failed to delete user");
                        }
                        fetchData();
                      }}
                    >
                      <Button variant="destructive" size="icon" className="size-7">
                        ×
                      </Button>
                    </ConfirmDialog>
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
            <DialogTitle>Add Tokens</DialogTitle>
            <DialogDescription>Add bonus tokens to {selectedUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Balance</Label>
              <div className="col-span-3 text-sm">
                {(selectedUser?.tokens?.balance ?? 0).toLocaleString()} tokens
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
            <div className="flex gap-2">
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

      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Admin Permissions</DialogTitle>
            <DialogDescription>
              {selectedUser?.adminUser ? "Edit admin permissions" : "Grant admin privileges"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                className="col-span-3 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="REGULAR_ADMIN">Regular Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Permissions</Label>
              <div className="col-span-3 space-y-2">
                {[
                  AdminPermission.MANAGE_STUDIES,
                  AdminPermission.MANAGE_USERS,
                  AdminPermission.MANAGE_PAYMENTS,
                  AdminPermission.MANAGE_INVITATION_CODES,
                  AdminPermission.VIEW_ENTERPRISE_LEADS,
                ].map((permission) => (
                  <div className="flex items-center space-x-2" key={permission}>
                    <input
                      type="checkbox"
                      id={`perm-${permission}`}
                      checked={selectedPermissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, permission]);
                        } else {
                          setSelectedPermissions(
                            selectedPermissions.filter((p) => p !== permission),
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`perm-${permission}`} className="text-sm font-medium">
                      {permission.replace("_", " ")}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            {selectedUser?.adminUser && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!selectedUser) return;
                  await updateAdminStatus(selectedUser.id, false);
                  setIsAdminDialogOpen(false);
                  fetchData();
                }}
              >
                Remove Admin Access
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedUser) return;
                await updateAdminStatus(selectedUser.id, true, selectedRole, selectedPermissions);
                setIsAdminDialogOpen(false);
                fetchData();
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
