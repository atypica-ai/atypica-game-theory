"use client";
import { SageActivityFeed } from "./components/SageActivityFeed";
import { SageStatsOverview } from "./components/SageStatsOverview";

export function SageDetailPageClient() {
  return (
    <div className="space-y-6">
      <SageStatsOverview />
      <SageActivityFeed />
    </div>
  );
}
