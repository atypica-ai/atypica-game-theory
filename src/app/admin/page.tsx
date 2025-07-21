"use client";
import {
  AlertTriangleIcon,
  BarChartIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileTextIcon,
  MessageCircleIcon,
  MonitorPlayIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
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
          href="/admin/analyst-reports"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <FileTextIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Analyst Reports</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage generated analyst reports</p>
        </Link>

        <Link
          href="/admin/featured-studies"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <StarIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Featured Studies</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage featured studies that appear on the homepage
          </p>
        </Link>

        <Link
          href="/admin/token-consumption"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <MonitorPlayIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Token Consumption</h2>
          </div>
          <p className="text-sm text-muted-foreground">Monitor token usage across chats</p>
        </Link>

        <Link
          href="/admin/statistics"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <BarChartIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Statistics</h2>
          </div>
          <p className="text-sm text-muted-foreground">View platform analytics and insights</p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <UsersIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage user accounts</p>
        </Link>

        <Link
          href="/admin/payments"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Payments</h2>
          </div>
          <p className="text-sm text-muted-foreground">Test payment integrations with Ping++</p>
        </Link>

        <Link
          href="/admin/enterprise-leads"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <MessageCircleIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Enterprise Leads</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage enterprise leads</p>
        </Link>

        <Link
          href="/admin/personas"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <UserIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Personas</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage user personas</p>
        </Link>

        <Link
          href="/admin/issue-studies"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Issue Studies</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage studies with reported issues</p>
        </Link>

        <Link
          href="/admin/maintenance"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Maintenance Mode</h2>
          </div>
          <p className="text-sm text-muted-foreground">Toggle site maintenance mode</p>
        </Link>

        <Link
          href="/"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <DatabaseIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">View Site</h2>
          </div>
          <p className="text-sm text-muted-foreground">Return to the main website</p>
        </Link>
      </div>
    </div>
  );
}
