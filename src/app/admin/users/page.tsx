"use client";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getUsers } from "./actions";

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Pick<User, "id" | "email" | "createdAt">[]>([]);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getUsers();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch invitation codes");
      }
      setUsers(result?.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUsers();
      setIsLoading(false);
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users Management</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      {/* <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <Input placeholder="Search users..." className="max-w-sm" />
          <Button>Search</Button>
        </div>
        <div>
          <Button variant="outline">Export CSV</Button>
        </div>
      </div> */}

      <div className="mb-4 overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => (
              <tr key={user.id.toString()}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.id}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{user.email}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />
      </div>
    </div>
  );
}
