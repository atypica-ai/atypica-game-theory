"use client";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PaginationInfo } from "../utils";
import { fetchUsers } from "./actions";

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Pick<User, "id" | "email" | "createdAt">[]>([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchUsers(currentPage);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message);
    }
    setIsLoading(false);
  }, [currentPage]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchData();
      setIsLoading(false);
    }
    // currentPage 变化以后要重新触发 fetchData
  }, [status, router, currentPage, fetchData]);

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users Management</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}
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
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide">
            {users.map((user) => (
              <tr key={user.id.toString()}>
                <td className="whitespace-nowrap px-6 py-4 text-sm">{user.id}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">{user.email}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
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

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
