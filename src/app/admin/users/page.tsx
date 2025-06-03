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
import { AdminRole } from "@/prisma/client";
import { CheckIcon, CoinsIcon, CopyIcon, LinkIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AdminPermission, PaginationInfo } from "../types";
import {
  addTokensToUser,
  deleteUserAccount,
  fetchUsers,
  generateImpersonationLoginForUser,
  updateAdminStatus,
  verifyUserEmail,
} from "./actions";

type User = ExtractServerActionData<typeof fetchUsers>[number];

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
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
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [isGeneratingLogin, setIsGeneratingLogin] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const generateLoginUrl = async (user: User) => {
    setSelectedUser(user);
    setIsGeneratingLogin(true);
    setError("");
    try {
      const result = await generateImpersonationLoginForUser(user.id, 24);
      if (result.success) {
        setLoginUrl(result.data);
        setIsLoginDialogOpen(true);
      } else {
        setError(result.message || "Failed to generate login URL");
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setIsGeneratingLogin(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead></TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Admin Role</TableHead>
              <TableHead>Impersonation Login</TableHead>
              <TableHead>Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-sm">No users found</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id.toString()}>
                  <TableCell className="whitespace-nowrap text-sm">{user.id}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{user.email}</TableCell>
                  {/* TODO: 去要按照 currency 区分 */}
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {user.paymentRecords.reduce((acc, r) => acc + r.amount, 0)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {formatTokensNumber(user.tokens?.balance ?? 0)} <br />
                    <span className="text-xs text-muted-foreground">
                      {(user.tokens?.balance ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs text-amber-500 hover:text-amber-500 gap-0"
                      onClick={() => openTokensDialog(user)}
                      title="Add tokens"
                    >
                      <PlusIcon className="size-3" />
                      <CoinsIcon className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <div>{formatDate(user.createdAt, locale)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {user.emailVerified ? (
                        <span className="text-green-600">
                          Verified {formatDate(user.emailVerified, locale)}
                        </span>
                      ) : (
                        <>
                          <span className="font-medium text-red-500">Not Verified</span>
                          <ConfirmDialog
                            title="Verify User Email"
                            description={`Are you sure you want to mark ${user.email} as verified?`}
                            onConfirm={async () => {
                              await verifyUserEmail(user.id);
                              fetchData();
                            }}
                          >
                            <Button variant="outline" size="icon" className="size-6 text-xs">
                              ✓
                            </Button>
                          </ConfirmDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {user.lastLogin ? (
                      <>
                        <div>{formatDate(new Date(user.lastLogin.timestamp), locale)}</div>
                        <div>{user.lastLogin.clientIp}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
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
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center">
                    {user.emailVerified ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => generateLoginUrl(user)}
                        disabled={isGeneratingLogin}
                        title="Generate impersonation login URL"
                      >
                        <LinkIcon className="size-3" />
                        {isGeneratingLogin ? "..." : "Login"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Email not verified</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
                  AdminPermission.VIEW_TOKEN_CONSUMPTION,
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

      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Impersonation Login URL</DialogTitle>
            <DialogDescription>
              Generated login URL for {selectedUser?.email} (valid for 24 hours)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Login URL</Label>
              <div className="flex gap-2">
                <Input value={loginUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1">
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                This URL will automatically log in the user and expires in 24 hours.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLoginDialogOpen(false);
                setLoginUrl("");
                setCopied(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
