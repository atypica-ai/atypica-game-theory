"use client";
import { Button } from "@/components/ui/button";
import { InvitationCode } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createInvitationCode, deleteInvitationCode, getInvitationCodes } from "./actions";

export default function InvitationCodesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchCodes();
    }
  }, [status, router]);

  const fetchCodes = async () => {
    try {
      setIsLoading(true);
      const result = await getInvitationCodes();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch invitation codes");
      }

      setCodes(result.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      const result = await createInvitationCode();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate invitation code");
      }

      await fetchCodes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteCode = async (id: number) => {
    try {
      const result = await deleteInvitationCode(id);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete invitation code");
      }

      await fetchCodes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="container mt-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Invitation Codes</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6">
        <Button onClick={generateCode}>Generate New Code</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Used By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {codes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No invitation codes found
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {code.code}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(code.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {code.usedBy ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Used
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {code.usedBy ? code.usedBy : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {!code.usedBy && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCode(code.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
