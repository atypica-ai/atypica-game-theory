"use client";
import { AlertTriangle, CreditCard, Database, Key, MessageCircle, Star, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
        <Link
          href="/admin/featured-studies"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <Star className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Featured Studies</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage featured studies that appear on the homepage
          </p>
        </Link>

        <Link
          href="/admin/issue-studies"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Issue Studies</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage studies with reported issues</p>
        </Link>

        <Link
          href="/admin/maintenance"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Maintenance Mode</h2>
          </div>
          <p className="text-sm text-muted-foreground">Toggle site maintenance mode</p>
        </Link>

        <Link
          href="/admin/invitation-codes"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <Key className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Invitation Codes</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage invitation codes for new user registration
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <Users className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage user accounts</p>
        </Link>

        <Link
          href="/admin/payments"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <CreditCard className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Payments</h2>
          </div>
          <p className="text-sm text-muted-foreground">Test payment integrations with Ping++</p>
        </Link>

        <Link
          href="/admin/enterprise-leads"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <MessageCircle className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Enterprise Leads</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage enterprise leads</p>
        </Link>

        <Link
          href="/"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <Database className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">View Site</h2>
          </div>
          <p className="text-sm text-muted-foreground">Return to the main website</p>
        </Link>
      </div>
    </div>
  );
}
