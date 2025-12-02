"use client";
import { SageActivityFeed } from "./components/SageActivityFeed";
import { SageStatsOverview } from "./components/SageStatsOverview";

export function SageDetailPageClient() {
  return (
    <div className="p-6 space-y-8">
      <SageStatsOverview />
      <SageActivityFeed />
    </div>
  );
}
