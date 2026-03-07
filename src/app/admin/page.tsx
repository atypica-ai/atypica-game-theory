"use client";
import {
  AlertTriangleIcon,
  BarChartIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileTextIcon,
  HeadphonesIcon,
  MessageCircleIcon,
  MonitorPlayIcon,
  RadioIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
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
          href="/admin/studies"
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
          href="/admin/studies/reports"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <FileTextIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Reports</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage generated study reports</p>
        </Link>

        <Link
          href="/admin/studies/podcasts"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <HeadphonesIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Podcasts</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage generated study podcasts</p>
        </Link>

        <Link
          href="/admin/studies/token-consumption"
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
            <UserIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Users</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage user accounts</p>
        </Link>

        <Link
          href="/admin/teams"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <UsersIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Teams</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage teams</p>
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
          href="/admin/payments/enterprise-leads"
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
          href="/admin/interviews"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <VideoIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Interviews</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage interview projects and sessions</p>
        </Link>

        <Link
          href="/admin/studies/issues"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Issue Studies</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage studies with reported issues</p>
        </Link>

        <Link
          href="/admin/pulses"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <RadioIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Pulse Marketplace</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage pulse categories and trigger gathering
          </p>
        </Link>

        <Link
          href="/admin/pulse-recommendations"
          className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-2">
            <RadioIcon className="h-5 w-5 mr-2" />
            <h2 className="text-xl font-semibold">Pulse Recommendations Test</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Test pulse recommendation system for users
          </p>
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
