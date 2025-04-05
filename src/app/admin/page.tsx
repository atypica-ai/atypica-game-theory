"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Featured Studies</h2>
          <p className="text-sm text-muted-foreground">
            Manage featured studies that appear on the homepage
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Invitation Codes</h2>
          <p className="text-sm text-muted-foreground">
            Manage invitation codes for new user registration
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">View and manage user accounts</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Payment Test</h2>
          <p className="text-sm text-muted-foreground">Test payment integrations with Ping++</p>
        </div>
      </div>
    </div>
  );
}
