"use client";
import { Button } from "@/components/ui/button";
import { InvitationCode } from "@prisma/client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchCodes();
    }
  }, [status, router]);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const result = await getInvitationCodes();
      setCodes(result.data);
      setIsAdmin(result.isAdmin);
    } catch (error) {
      setError((error as Error).message);
    }
    setIsLoading(false);
  };

  const generateCode = async () => {
    try {
      await createInvitationCode();
      await fetchCodes();
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleDeleteCode = async (id: number) => {
    try {
      await deleteInvitationCode(id);
      await fetchCodes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="container mt-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Invitation Codes</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={generateCode} disabled={!isAdmin && codes.length >= 5}>
            Generate New Code
          </Button>
          {isAdmin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
              Admin
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {isAdmin ? (
            <span>Total: {codes.length} codes</span>
          ) : (
            <span>{codes.length}/5 codes used</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Used By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide">
            {codes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm">
                  No invitation codes found
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">{code.code}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {new Date(code.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{code.createdBy}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {code.usedBy ? (
                      <span className="rounded-full bg-green-100 dark:bg-green-200 px-2 py-1 text-xs font-medium text-green-800">
                        Used
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-200 px-2 py-1 text-xs font-medium text-blue-800">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {code.usedBy ? code.usedBy : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!isAdmin || !!code.usedBy}
                          title="Only administrators can delete unused codes"
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this code?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {}}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCode(code.id)}>
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
